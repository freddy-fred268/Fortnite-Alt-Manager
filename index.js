
// Load environment variables from .env
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, REST, Routes, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

// Configurable variables from .env
const GUILD_ID = process.env.GUILD_ID || '';
const OWNER_ID = process.env.OWNER_ID || '';
const TOKEN = process.env.BOT_TOKEN;

// Create Discord client with required intents and partials
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// Import alt management functions and persistent storage
const { alts, statusEmojis, addAlt, removeAlt, setAltStatus, setAllStatus } = require('./lib/altManager');

// Helper: check if user is the owner
function isOwner(userId) {
    return userId === OWNER_ID;
}

// Helper: check if guild is allowed
function isGuildAllowed(guildId) {
    return guildId === GUILD_ID;
}


// Handle DM commands from the owner for alt management
client.on(Events.MessageCreate, async (message) => {
    // Only allow DM commands from owner, and only if the bot is in the correct guild
    if (!message.guild && isOwner(message.author.id)) {
        // Check if bot is in the correct guild
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return await message.reply('Bot is not in the allowed server.');
        // Parse command and quoted username
        const [command, ...rest] = message.content.trim().split(/\s+/);
        // Helper to extract quoted username
        function extractQuoted(str) {
            const match = str.match(/"([^"]+)"/);
            return match ? match[1] : null;
        }
        // Add alt command
        if (command === '.addbot') {
            const username = extractQuoted(message.content);
            if (username) {
                if (addAlt(username)) {
                    await message.reply(`Added alt: ${username}`);
                } else {
                    await message.reply(`Alt already exists: ${username}`);
                }
            } else {
                await message.reply('Usage: .addbot "username"');
            }
        // Remove alt command
        } else if (command === '.removebot') {
            const username = extractQuoted(message.content);
            if (username === 'all') {
                removeAlt('all');
                await message.reply('All alts removed.');
            } else if (username) {
                if (removeAlt(username)) {
                    await message.reply(`Removed alt: ${username}`);
                } else {
                    await message.reply(`Alt not found: ${username}`);
                }
            } else {
                await message.reply('Usage: .removebot "username" or .removebot "all"');
            }
        // Set status command
        } else if (command === '.status') {
            const username = extractQuoted(message.content);
            const afterQuote = message.content.split('"')[2];
            const status = afterQuote ? afterQuote.trim().toLowerCase() : '';
            if (!username || !status) {
                await message.reply('Usage: .status "username" <online|idle|offline|banned> or .status "all" <status>');
                return;
            }
            if (!['online', 'idle', 'offline', 'banned'].includes(status)) {
                await message.reply('Invalid status. Use online, idle, offline, or banned.');
                return;
            }
            if (username === 'all') {
                setAllStatus(status);
                await message.reply(`Set all alts to ${status}.`);
            } else {
                if (setAltStatus(username, status)) {
                    await message.reply(`Set ${username} to ${status}.`);
                } else {
                    await message.reply(`Alt not found: ${username}`);
                }
            }
        }
    }
});



// Register slash command on bot ready
client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}`);
    // Register /alts command for the guild
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            {
                body: [
                    {
                        name: 'alts',
                        description: 'List all alts or filter by status',
                        options: [
                            {
                                name: 'filter',
                                description: 'Filter by status',
                                type: 3, // STRING
                                required: false,
                                choices: [
                                    { name: 'Online', value: 'online' },
                                    { name: 'Idle', value: 'idle' },
                                    { name: 'Offline', value: 'offline' },
                                    { name: 'Banned', value: 'banned' }
                                ]
                            }
                        ]
                    }
                ]
            }
        );
        console.log('Slash command /alts registered.');
    } catch (err) {
        console.error('Failed to register slash command:', err);
    }
});


// Helper: create paginated embed for /alts command
function getAltsEmbed(guildName, altsList, page, perPage, filter) {
    const start = page * perPage;
    const end = start + perPage;
    const pageAlts = altsList.slice(start, end);
    const embed = new EmbedBuilder()
        .setTitle(`${guildName}'s Alts:`)
        .setDescription(
            pageAlts.length
                ? pageAlts.map(a => `${statusEmojis[a.status] || '❓'}${a.status.charAt(0).toUpperCase() + a.status.slice(1)} - ${a.name}`).join('\n')
                : 'No alts found.'
        )
        .setFooter({ text: `Page ${page + 1} / ${Math.ceil(altsList.length / perPage) || 1}${filter ? ` | Filter: ${filter}` : ''}` });
    return embed;
}


// Handle slash command and pagination for /alts
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
    // Restrict to allowed guild
    if (interaction.guildId !== GUILD_ID) {
        if (interaction.isChatInputCommand()) {
            return interaction.reply({ content: 'This command can only be used in the allowed server.', ephemeral: true });
        }
        return;
    }

    // /alts command: show paginated list of alts
    if (interaction.isChatInputCommand() && interaction.commandName === 'alts') {
        let filter = interaction.options.getString('filter');
        let filteredAlts = filter ? alts.filter(a => a.status === filter) : alts;
        let page = 0;
        const perPage = 4;
        const embed = getAltsEmbed(interaction.guild.name, filteredAlts, page, perPage, filter);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(filteredAlts.length <= perPage)
        );
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
        // Store state for pagination
        interaction.client._altsPagination = {
            [interaction.id]: { filter, page, perPage, filteredAlts, userId: interaction.user.id, guildName: interaction.guild.name }
        };
    }
    // Pagination buttons for /alts
    if (interaction.isButton() && interaction.message.interaction && interaction.message.interaction.commandName === 'alts') {
        const pag = interaction.client._altsPagination?.[interaction.message.interaction.id];
        if (!pag || interaction.user.id !== pag.userId) return interaction.reply({ content: 'You cannot control this pagination.', ephemeral: true });
        let { filter, page, perPage, filteredAlts, guildName } = pag;
        if (interaction.customId === 'next') page++;
        if (interaction.customId === 'prev') page--;
        page = Math.max(0, Math.min(page, Math.ceil(filteredAlts.length / perPage) - 1));
        pag.page = page;
        const embed = getAltsEmbed(guildName, filteredAlts, page, perPage, filter);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page >= Math.ceil(filteredAlts.length / perPage) - 1)
        );
        await interaction.update({ embeds: [embed], components: [row] });
    }
});


// Start the bot
client.login(TOKEN);
