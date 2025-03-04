// Supabase configuration
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Game state
let gameState = {
    gameCode: null,
    currentPlayer: null,
    isHost: false,
    players: [],
    currentWord: null,
    guessingPlayer: null,
    clues: {},
    gameStarted: false,
    score: 0,
    subscription: null,
    refreshInterval: null
}

// DOM Elements
const screens = {
    waiting: document.getElementById('waiting-screen'),
    wordSelection: document.getElementById('word-selection-screen'),
    clueInput: document.getElementById('clue-input-screen'),
    guessInput: document.getElementById('guess-input-screen'),
    result: document.getElementById('result-screen')
}

const elements = {
    startGameBtn: document.getElementById('start-game-btn'),
    playersList: document.getElementById('players-list'),
    playersCount: document.getElementById('players-count'),
    gameCode: document.getElementById('game-code'),
    clueInput: document.getElementById('clue-input'),
    submitClueBtn: document.getElementById('submit-clue-btn'),
    guessInput: document.getElementById('guess-input'),
    submitGuessBtn: document.getElementById('submit-guess-btn'),
    cluesList: document.getElementById('clues-list'),
    allCluesList: document.getElementById('all-clues-list'),
    currentWord: document.getElementById('current-word'),
    guesserName: document.getElementById('guesser-name'),
    resultMessage: document.getElementById('result-message'),
    nextRoundBtn: document.getElementById('next-round-btn'),
    waitingForHost: document.getElementById('waiting-for-host'),
    yourClue: document.getElementById('your-clue'),
    revealWord: document.querySelector('.highlight-word')
}

// Get game code from URL
const urlParams = new URLSearchParams(window.location.search)
gameState.gameCode = urlParams.get('code')
gameState.currentPlayer = urlParams.get('player')

// Function to safely hide all screens
function hideAllScreens() {
    Object.entries(screens).forEach(([name, screen]) => {
        if (screen) {
            screen.style.display = 'none'
        } else {
            console.warn(`Screen element ${name} not found in DOM`)
        }
    })
}

// Function to safely show a screen
function showScreen(screenName) {
    hideAllScreens()
    const screen = screens[screenName]
    if (screen) {
        screen.style.display = 'block'
    } else {
        console.warn(`Attempted to show non-existent screen: ${screenName}`)
    }
}

// Words database
const words = [
    'SUMMER', 'BEACH', 'MOUNTAIN', 'COFFEE', 'MUSIC',
    'DANCE', 'BOOK', 'MOVIE', 'GARDEN', 'SUNSET',
    'OCEAN', 'FOREST', 'DREAM', 'SMILE', 'FRIEND',
    'PIZZA', 'TRAVEL', 'STARS', 'FLOWER', 'RAINBOW',
    'WINTER', 'SPRING', 'AUTUMN', 'HOLIDAY', 'PARTY',
    'SCHOOL', 'FAMILY', 'NATURE', 'MORNING', 'NIGHT'
]

// Initialize game room
async function initializeGameRoom() {
    try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const gameCode = urlParams.get('code')
        const playerName = urlParams.get('player')

        if (!gameCode || !playerName) {
            throw new Error('Missing game code or player name')
        }

        // Set game code display
        if (elements.gameCode) {
            elements.gameCode.textContent = gameCode
        }

        gameState.gameCode = gameCode
        gameState.currentPlayer = playerName

        // Initial game state fetch
        const { data: game, error } = await supabaseClient
            .from('games')
            .select('*')
            .eq('code', gameCode)
            .single()

        if (error) {
            throw error
        }

        if (!game) {
            throw new Error('Game not found')
        }

        // Update initial game state
        updateGameState(game)

        // Subscribe to game changes
        const subscription = supabaseClient
            .channel(`game_${gameCode}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'games',
                filter: `code=eq.${gameCode}`
            }, payload => {
                console.log('Game update received:', payload)
                const updatedGame = payload.new
                updateGameState(updatedGame)
            })
            .subscribe(status => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to game updates')
                }
            })

        // Store subscription for cleanup
        gameState.subscription = subscription

        // Set up periodic refresh
        gameState.refreshInterval = setInterval(async () => {
            const { data: refreshedGame, error: refreshError } = await supabaseClient
                .from('games')
                .select('*')
                .eq('code', gameCode)
                .single()

            if (!refreshError && refreshedGame) {
                updateGameState(refreshedGame)
            }
        }, 3000) // Refresh every 3 seconds

    } catch (error) {
        console.error('Error in game initialization:', error)
        throw error // Let the caller handle the error
    }
}

// Update game state and UI
function updateGameState(game) {
    if (!game) return

    console.log('Updating game state:', game)

    gameState.isHost = game.host === gameState.currentPlayer
    gameState.players = game.players || []
    gameState.currentWord = game.current_word
    gameState.guessingPlayer = game.guessing_player
    gameState.clues = game.clues || {}
    gameState.gameStarted = game.status === 'playing'

    updatePlayersList()
    updateGameScreen(game)

    // Update players count
    if (elements.playersCount) {
        elements.playersCount.textContent = gameState.players.length
    }

    // Show/hide start button for host
    if (gameState.isHost && !gameState.gameStarted && gameState.players.length >= 3) {
        if (elements.startGameBtn) {
            elements.startGameBtn.style.display = 'block'
        }
    } else {
        if (elements.startGameBtn) {
            elements.startGameBtn.style.display = 'none'
        }
    }
}

// Update players list in UI
function updatePlayersList() {
    if (!elements.playersList) return

    elements.playersList.innerHTML = gameState.players
        .map(player => {
            let status = []
            if (player === gameState.guessingPlayer) status.push('(Guesser)')
            if (player === gameState.currentPlayer) status.push('(You)')
            if (player === gameState.host) status.push('(Host)')
            const statusText = status.length ? ` ${status.join(' ')}` : ''
            return `<li>${player}${statusText}</li>`
        })
        .join('')
}

// Update game screen based on game state
function updateGameScreen(game) {
    hideAllScreens()

    if (!game.status || game.status === 'waiting') {
        showScreen('waiting')
        if (gameState.isHost && game.players.length >= 3) {
            if (elements.startGameBtn) {
                elements.startGameBtn.style.display = 'block'
            }
        }
        return
    }

    if (game.status === 'playing') {
        if (!game.current_word) {
            showScreen('wordSelection')
        } else if (gameState.currentPlayer === game.guessing_player) {
            showScreen('guessInput')
            updateCluesList(game.clues || {})
        } else {
            showScreen('clueInput')
            if (elements.currentWord) elements.currentWord.textContent = game.current_word
            if (elements.guesserName) elements.guesserName.textContent = game.guessing_player

            // Reset clue input state
            if (elements.clueInput) {
                elements.clueInput.value = ''
                elements.clueInput.disabled = false
            }
            if (elements.submitClueBtn) {
                elements.submitClueBtn.disabled = false
            }
            if (elements.yourClue) {
                elements.yourClue.style.display = 'none'
            }

            // Check if player has already submitted a clue
            if (game.clues && game.clues[gameState.currentPlayer]) {
                if (elements.clueInput) elements.clueInput.disabled = true
                if (elements.submitClueBtn) elements.submitClueBtn.disabled = true
                if (elements.yourClue) {
                    elements.yourClue.style.display = 'block'
                    elements.yourClue.textContent = game.clues[gameState.currentPlayer]
                }
            }
        }
    } else if (game.status === 'result') {
        showScreen('result')
        showResult(game.last_guess === game.last_word, game.last_word, game.clues || {})
    }
}

// Update clues list in the guessing screen
function updateCluesList(clues) {
    if (!elements.cluesList) return
    
    const clueItems = Object.entries(clues)
        .map(([player, clue]) => `<div class="clue-item">${player}: ${clue}</div>`)
        .join('')
    
    elements.cluesList.innerHTML = clueItems
}

// Show round result
function showResult(isCorrect, word, clues) {
    if (!elements.resultMessage || !elements.revealWord || !elements.allCluesList) return

    elements.resultMessage.textContent = isCorrect ? 'Correct!' : 'Wrong!'
    elements.resultMessage.className = `result-message ${isCorrect ? 'success' : 'failure'}`
    elements.revealWord.textContent = word

    const cluesList = Object.entries(clues)
        .map(([player, clue]) => `<div class="clue-item">${player}: ${clue}</div>`)
        .join('')
    
    elements.allCluesList.innerHTML = cluesList

    if (gameState.isHost) {
        if (elements.nextRoundBtn) elements.nextRoundBtn.style.display = 'block'
        if (elements.waitingForHost) elements.waitingForHost.style.display = 'none'
    } else {
        if (elements.nextRoundBtn) elements.nextRoundBtn.style.display = 'none'
        if (elements.waitingForHost) elements.waitingForHost.style.display = 'block'
    }
}

// Validate clue
function validateClue(clue) {
    // Only letters and spaces allowed
    return /^[A-Za-z\s]+$/.test(clue) && 
           // Only one word
           !clue.includes(' ') && 
           // Not the same as the word to guess
           clue.toUpperCase() !== gameState.currentWord
}

// Start new round
async function startNewRound() {
    try {
        // Get current game state
        const { data: game, error: fetchError } = await supabaseClient
            .from('games')
            .select('*')
            .eq('code', gameState.gameCode)
            .single()

        if (fetchError) {
            console.error('Error fetching game state:', fetchError)
            return
        }

        // Get used words or initialize empty array
        const usedWords = game.used_words || []
        
        // Filter available words
        let availableWords = words.filter(word => !usedWords.includes(word))
        
        // If all words have been used, reset the list
        if (availableWords.length === 0) {
            availableWords = words
            usedWords.length = 0
        }
        
        // Select random word and new guesser
        const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)]
        const currentGuesser = gameState.guessingPlayer
        let newGuesser

        // Select a new guesser that's different from the current one
        do {
            newGuesser = gameState.players[Math.floor(Math.random() * gameState.players.length)]
        } while (newGuesser === currentGuesser && gameState.players.length > 1)

        // Update game state
        const { error: updateError } = await supabaseClient
            .from('games')
            .update({
                status: 'playing',
                current_word: randomWord,
                guessing_player: newGuesser,
                clues: {},
                used_words: [...usedWords, randomWord]
            })
            .eq('code', gameState.gameCode)

        if (updateError) {
            console.error('Error starting new round:', updateError)
            alert('Failed to start new round')
        }
    } catch (error) {
        console.error('Error starting new round:', error)
        alert('Failed to start new round')
    }
}

// Event Listeners
if (elements.startGameBtn) {
    elements.startGameBtn.addEventListener('click', startNewRound)
}

if (elements.submitGuessBtn) {
    elements.submitGuessBtn.addEventListener('click', async () => {
        const guess = elements.guessInput.value.trim().toUpperCase()
        if (!guess) return

        try {
            const { data: game } = await supabaseClient
                .from('games')
                .select('*')
                .eq('code', gameState.gameCode)
                .single()

            const isCorrect = guess === game.current_word

            // Update game with result and store the guess
            const { error } = await supabaseClient
                .from('games')
                .update({ 
                    status: 'result',
                    last_guess: guess,
                    last_word: game.current_word,
                    last_clues: game.clues || {}
                })
                .eq('code', gameState.gameCode)

            if (error) {
                console.error('Error updating game result:', error)
                return
            }

            elements.guessInput.value = ''
        } catch (error) {
            console.error('Error submitting guess:', error)
            alert('Failed to submit guess')
        }
    })
}

if (elements.clueInput) {
    elements.clueInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            elements.submitClueBtn.click()
        }
    })
}

if (elements.submitClueBtn) {
    elements.submitClueBtn.addEventListener('click', async () => {
        if (!elements.clueInput) return
        
        const clue = elements.clueInput.value.trim()
        if (!clue) {
            alert('Please enter a clue')
            return
        }

        if (!validateClue(clue)) {
            alert('Invalid clue! Please enter a single word using only letters.')
            return
        }

        try {
            // Get current clues
            const { data: game, error: fetchError } = await supabaseClient
                .from('games')
                .select('clues')
                .eq('code', gameState.gameCode)
                .single()

            if (fetchError) throw fetchError

            // Update clues
            const updatedClues = {
                ...(game.clues || {}),
                [gameState.currentPlayer]: clue.toUpperCase()
            }

            const { error: updateError } = await supabaseClient
                .from('games')
                .update({ clues: updatedClues })
                .eq('code', gameState.gameCode)

            if (updateError) throw updateError

            // Disable input after successful submission
            elements.clueInput.disabled = true
            elements.submitClueBtn.disabled = true
            if (elements.yourClue) {
                elements.yourClue.style.display = 'block'
                elements.yourClue.textContent = clue.toUpperCase()
            }

        } catch (error) {
            console.error('Error submitting clue:', error)
            alert('Failed to submit clue')
        }
    })
}

if (elements.nextRoundBtn) {
    elements.nextRoundBtn.addEventListener('click', startNewRound)
}

// Initialize the game room when the page loads
window.addEventListener('load', initializeGameRoom)
