## Features
- Add, remove, and update alt accounts via DM commands (owner only)
- List alts with status and pagination via slash command `/alts`
- Persistent storage using JSON files
- Restricts all features to a single server (guild)

## Setup
1. **Clone or download this repository.**
2. **Install dependencies:**
   ```
   npm install
   ```
3. **Rename `.env.example` file to `.env`** in the root directory and change the variables to match the correct information:
   ```
   BOT_TOKEN=your-bot-token-here
   OWNER_ID=your-discord-user-id-here
   GUILD_ID=your-server-id-here
   ```
   - `BOT_TOKEN`: Your Discord bot token from the Discord Developer Portal.
   - `OWNER_ID`: Your Discord user ID (the only user who can use DM commands).
   - `GUILD_ID`: The Discord server (guild) ID where the bot will operate.

4. **Run the bot:**
   ```
   npm start
   ```

## Usage

### DM Commands (Owner Only)
Send these as a DM to the bot:
- `.addbot "username"` — Adds an alt with the given username (supports spaces)
- `.removebot "username"` — Removes the alt with the given username
- `.removebot "all"` — Removes all alts
- `.status "username" <online|idle|offline|banned>` — Sets the status of the alt
- `.status "all" <online|idle|offline|banned>` — Sets the status for all alts

### Slash Command (Anyone in Server)
- `/alts [filter]` — Lists all alts, or only those with a specific status (Online, Idle, Offline, Banned). Includes pagination buttons if needed.

## Data Storage
- Alt data is stored in `data/alts.json` and is persistent across restarts.

## Notes
- The bot must be invited to your server with the `applications.commands` and `bot` scopes, and have permission to manage slash commands.
- Only the specified OWNER_ID can use DM commands.
- All commands and features are restricted to the specified GUILD_ID.
- Code written by Discord User freddy._.fred's father with permission to post this on GitHub. The comments were created through AI to describe as easily as possible which segments does which function.
