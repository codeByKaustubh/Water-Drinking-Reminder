# Water Drinking Reminder <br>
https://sipsentry.netlify.app/

A small progressive web app (PWA) that reminds you to drink water at regular intervals.

## Features

- Set a reminder interval (minutes) to receive regular reminders to drink water
- Local storage of reminder settings (interval, sound)
- PWA installable (manifest + service worker)
- Offline fallback (`offline.html`)
- Basic accessibility and responsive design

## Run locally

1. Serve the folder with a static server (recommended):
   - `npx http-server` or `python -m http.server`
2. Open `http://localhost:8080` (or the port your server uses).

Note: Service workers only work on `http://localhost` or HTTPS.

## Contribute

- Fixes and features are welcome — please open issues or pull requests.
- Add tests and CI to the project (GitHub Actions) to run linters and code checks.

## License

MIT
