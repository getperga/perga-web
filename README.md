# Perga Web

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)
[![CI](https://github.com/getperga/perga-web/actions/workflows/ci.yml/badge.svg)](https://github.com/getperga/perga-web/actions/workflows/ci.yml)

The browser client for [Perga](https://getperga.me/) — a personal workspace for notes, plans, and ideas. The backend lives in the [perga-api](https://github.com/getperga/perga-api) repository.

## Features

- Daily planning
- Monthly and custom agendas
- Notes management with folders, import, export, and full-text search
- User authentication and settings, including Google sign-in
- Responsive interface, dark theme, and PWA support

## Screenshots

<p>
  <img src="docs/assets/planner_screenshot.png" alt="Daily planner" width="300" />
  <span>&nbsp;&nbsp;&nbsp;</span>
  <img src="docs/assets/planner_weekly_screenshot.png" alt="Weekly planner" width="300" />
  <span>&nbsp;&nbsp;&nbsp;</span>
  <img src="docs/assets/notes_screenshot.png" alt="Notes" width="300" />
</p>

Try the hosted demo at [demo.getperga.me](https://demo.getperga.me/).

## Tech stack

- Node.js 20, React 19, and TypeScript
- [Vite](https://vite.dev/) and [Tailwind CSS](https://tailwindcss.com/)
- [Tiptap](https://tiptap.dev/) rich-text editor
- Docker and nginx

## Documentation

Installation, configuration, and development instructions are available in the [Perga documentation](https://docs.getperga.me/docs/perga-web).

## License

Perga Web is licensed under the [MIT License](LICENSE).
