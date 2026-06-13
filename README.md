# Perga Web

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Build](https://github.com/getperga/perga-web/actions/workflows/ci.yml/badge.svg)

A personal workspace for your notes, plans, and ideas.

## Overview

**[Perga API](https://github.com/getperga/perga-api)** is the core of the product.  
**Perga Web** is a standalone **browser client** that connects to the backend to provide a user-friendly web interface.

## Screenshots

 <p>
  <img src="docs/assets/planner_screenshot.png" alt="Planner" width="300" />
  <span>&nbsp;&nbsp;&nbsp;</span>
  <img src="docs/assets/planner_weekly_screenshot.png" alt="Planner Weekly" width="300" />
  <span>&nbsp;&nbsp;&nbsp;</span>
  <img src="docs/assets/notes_screenshot.png" alt="Notes" width="300" />
</p>

## Features

- Daily planner + weekly view
- Monthly and custom agendas
- Notes
- User authentication and settings
- Responsive design with mobile support
- PWA support
- Dark theme

## Demo

You can try out Perga without installation by visiting demo version at [https://demo.getperga.me/](https://demo.getperga.me/).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v8 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment:
   ```bash
   cp .env.example .env
   ```

### Development

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Documentation

For detailed documentation, please visit:
[https://docs.getperga.me/docs/perga-web](https://docs.getperga.me/docs/perga-web)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
