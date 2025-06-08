# Dyphira Wallet

A secure and user-friendly Chrome extension wallet for managing cryptocurrency assets.

## Features

- Secure wallet creation and management
- BIP39 mnemonic phrase support
- Modern React-based UI with Chakra UI
- Chrome extension integration

## Project Structure

```
dyphira-wallet/
├── src/
│   ├── assets/        # Static assets, images, icons
│   ├── components/    # Reusable UI components
│   ├── context/      # React context providers
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions and helpers
│   ├── App.tsx       # Main application component
│   └── main.tsx      # Application entry point
├── public/           # Public assets and manifest
└── dist/            # Built extension files
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Chrome browser for testing

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dyphira-wallet.git
cd dyphira-wallet
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build the extension:
```bash
npm run build:extension
```

5. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory

## Development

- `npm run dev` - Start development server
- `npm run build` - Build the application
- `npm run build:extension` - Build the Chrome extension
- `npm run lint` - Run ESLint

## Security

- Always use secure practices when handling private keys and sensitive data
- Never store private keys in plain text
- Use encryption for sensitive data storage
- Implement proper error handling for all crypto operations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
