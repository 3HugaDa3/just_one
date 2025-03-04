# Just One - Word Guessing Game

A fun multiplayer word guessing game built with HTML, CSS, JavaScript and Supabase.

## Supabase Credentials Protection

This project uses Supabase for real-time updates and data storage. To protect your Supabase credentials when hosting on GitHub Pages, the project follows these practices:

1. **Configuration Files**:
   - `config.js`: Contains default (empty) configuration
   - `.env-config.js`: Contains your actual Supabase credentials (not tracked by git)

2. **For Local Development**:
   - Create a `.env-config.js` file with your Supabase credentials
   - This file is listed in `.gitignore` and won't be pushed to GitHub

3. **For GitHub Pages Deployment**:
   - Before deploying, you'll need to provide your Supabase credentials

## Setup for GitHub Pages

When deploying to GitHub Pages:

1. During development, your credentials are safely stored in `.env-config.js` which isn't sent to GitHub
2. For GitHub Pages deployment, there are several options:

   **Option 1:** Use GitHub Secrets and Actions (recommended)
   - Set up a GitHub Action workflow that generates the config during build
   - Store your API keys in GitHub repository secrets

   **Option 2:** Host on Supabase Edge Functions or Netlify
   - These platforms have better built-in support for environment variables

   **Option 3:** Use placeholder credentials that only work for your GitHub Pages domain
   - Create a new Supabase project with domain restrictions to only work on your GitHub Pages URL

## Local Development

1. Clone this repository
2. Create a `.env-config.js` file with your Supabase credentials
3. Open `index.html` in your browser

## GitHub Pages Setup

For detailed instructions on setting up GitHub Pages with environment variables, see the [GitHub Documentation](https://docs.github.com/en/pages).
