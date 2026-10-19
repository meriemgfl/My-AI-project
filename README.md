# Skincare Routine Personaliser

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```powershell
npm install
```

Start the API in one terminal:

```powershell
npm run server
```

Start the web app in another terminal:

```powershell
npm run dev
```

Open <http://localhost:5173/>. The app uses a local SQLite database at `data/skincare.sqlite`; that folder is ignored by Git and holds this device's inventory, preferences, and routines.

## Screen-recording demo

The demo uses fictional product entries and a separate sample database. It does not read or write `data/skincare.sqlite`.

Start the demo API in one terminal:

```powershell
npm run server:demo
```

Start the demo web app in another terminal:

```powershell
npm run dev:demo
```

Open <http://localhost:5174/>. The database is `data/demo/skincare-demo.sqlite`, which is also ignored by Git. Its sample routine and products are labelled as fictional demo data in the app.

To check the production UI bundle, run:

```powershell
npm run build
```

## Implementation notes

- React and Vite provide the phone-width browser UI.
- Express exposes the local JSON API.
- SQLite persists the catalog, owned products, questionnaire preferences, and saved routines.
- Routine suggestions use deterministic catalog tags and ordering rules. The fit score reflects tag overlap; it is not a clinical efficacy score. Missing product-combination information is not assessed.
- Product records are a small curated demo catalog. Some product variants and package details still need confirmation.

## Project planning

The approved product scope, product requirements, and technical specification are in [`devpost/`](devpost/). The app map is [`devpost/app-map.html`](devpost/app-map.html).

## License

MIT. See [`LICENSE`](LICENSE) for the copyright attribution.
