// Supabase configuration
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// DOM Elements
const loginSection = document.getElementById('login-section')
const gameOptions = document.getElementById('game-options')
const joinSection = document.getElementById('join-section')
const usernameInput = document.getElementById('username')
const startBtn = document.getElementById('start-btn')
const createGameBtn = document.getElementById('create-game')
const joinGameBtn = document.getElementById('join-game')
const gameCodeInput = document.getElementById('game-code')
const joinBtn = document.getElementById('join-btn')

let currentPlayer = null

// Helper Functions
function showError(message) {
    // Create error element
    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message animate__animated animate__shakeX'
    errorDiv.textContent = message

    // Remove any existing error messages
    const existingError = document.querySelector('.error-message')
    if (existingError) {
        existingError.remove()
    }

    // Add new error message
    document.querySelector('.container').appendChild(errorDiv)

    // Remove error after 3 seconds
    setTimeout(() => {
        errorDiv.classList.add('animate__fadeOut')
        setTimeout(() => errorDiv.remove(), 500)
    }, 3000)
}

function showGameOptions() {
    joinSection.style.display = 'none'
    loginSection.style.display = 'none'
    gameOptions.style.display = 'block'
}

function validateUsername(username) {
    return username.length >= 2 && username.length <= 15 && /^[a-zA-Z0-9]+$/.test(username)
}

function validateGameCode(code) {
    return /^[A-Z0-9]{6}$/.test(code)
}

// Event Listeners
startBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim()
    if (!validateUsername(username)) {
        showError('Please enter a valid username (2-15 alphanumeric characters)')
        return
    }

    currentPlayer = username
    loginSection.classList.add('animate__fadeOut')
    setTimeout(() => {
        loginSection.style.display = 'none'
        gameOptions.style.display = 'block'
        gameOptions.classList.add('animate__fadeIn')
    }, 500)
})

createGameBtn.addEventListener('click', async () => {
    if (!currentPlayer) {
        showError('Please enter your name first')
        return
    }
    
    try {
        const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        const { error } = await supabaseClient
            .from('games')
            .insert({
                code: gameCode,
                host: currentPlayer,
                status: 'waiting',
                players: [currentPlayer],
                current_word: null,
                guessing_player: null,
                clues: {},
                used_words: []
            })
        
        if (error) {
            console.error('Error creating game:', error)
            showError('Failed to create game')
            return
        }
        
        window.location.href = `game-room.html?code=${gameCode}&player=${currentPlayer}`
    } catch (error) {
        console.error('Error creating game:', error)
        showError('Failed to create game')
    }
})

joinGameBtn.addEventListener('click', () => {
    gameOptions.classList.add('animate__fadeOut')
    setTimeout(() => {
        gameOptions.style.display = 'none'
        joinSection.style.display = 'block'
        joinSection.classList.add('animate__fadeIn')
    }, 500)
})

joinBtn.addEventListener('click', async () => {
    const gameCode = gameCodeInput.value.trim().toUpperCase()
    if (!validateGameCode(gameCode)) {
        showError('Please enter a valid 6-character game code')
        return
    }
    
    try {
        // Check if game exists and get current state
        const { data: game, error: fetchError } = await supabaseClient
            .from('games')
            .select('*')
            .eq('code', gameCode)
            .single()
        
        if (fetchError || !game) {
            showError('Game not found')
            return
        }

        // Check if game is already in progress
        if (game.status === 'playing') {
            showError('Game is already in progress')
            return
        }
        
        // Check if player is already in the game
        if (game.players.includes(currentPlayer)) {
            window.location.href = `game-room.html?code=${gameCode}&player=${currentPlayer}`
            return
        }
        
        // Add player to the game
        const updatedPlayers = [...game.players, currentPlayer]
        const { error: updateError } = await supabaseClient
            .from('games')
            .update({ players: updatedPlayers })
            .eq('code', gameCode)
        
        if (updateError) {
            console.error('Error updating players:', updateError)
            showError('Failed to join game')
            return
        }
        
        window.location.href = `game-room.html?code=${gameCode}&player=${currentPlayer}`
    } catch (error) {
        console.error('Error joining game:', error)
        showError('Failed to join game')
    }
})
