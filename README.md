# Nomod Payment Integration Demo

A demo web application built with **React.js and Node.js/Express** to explore Nomod's hosted payment link integration. It demonstrates how to collect payment details, create a hosted payment link through the Nomod API, and redirect customers to the Nomod checkout page.

This project is intended for development, learning, and integration testing.

## 🚀 Features

- Simple payment form to enter a payment title, item, amount, and currency.
- Backend API endpoint to create Nomod payment links.
- Secure server-side API requests to Nomod.
- API key stored in environment variables instead of frontend code.
- Displays the generated payment URL and raw API response for debugging.
- Opens the Nomod-hosted checkout page for the customer payment flow.
- Configurable success and failure redirect URLs.
- Error handling and troubleshooting support for API responses.

## 🛠️ Tech Stack

- **React.js** – Frontend UI
- **HTML5** – Page structure
- **CSS3** – Styling
- **JavaScript (JSX)** – Frontend logic
- **Node.js** – Backend runtime
- **Express.js** – Backend API
- **Nomod API** – Hosted payment link creation

## 📋 Requirements

Before running the project, make sure you have:

- Node.js 18 or later
- npm
- A verified Nomod account with API access enabled
- A valid Nomod API key
- Internet access to `api.nomod.com`

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <PROJECT_FOLDER>
```

Replace the placeholders with your actual GitHub repository URL and project directory name.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and add your Nomod API key.

```env
NOMOD_API_KEY=your_real_key_here
SUCCESS_URL=http://localhost:3000/success
FAILURE_URL=http://localhost:3000/failure
```

Use the exact variable names expected by your backend implementation. The URLs above are examples; configure them to match your application's routes.

**Important:** Never commit `.env` to GitHub or expose your secret API key in frontend JavaScript. Keep `.env` in `.gitignore`.

### 4. Start the application

```bash
npm start
```

If your project uses separate frontend and backend development servers, follow the scripts configured in `package.json` instead.

### 5. Open the application

Visit:

[http://localhost:3000](http://localhost:3000)

Enter the payment details and click **Create Nomod Payment Link**.

### 6. Test the payment flow

1. Enter a payment title and item description.
2. Enter the payment amount.
3. Select a supported currency.
4. Click **Create Nomod Payment Link**.
5. Review the generated payment URL and API response.
6. Open the hosted checkout URL to explore the customer payment experience.

## 💳 Payment Integration Flow

The application follows this sequence:

1. The customer submits the payment form in the React frontend.
2. The frontend sends a request to the local backend at `POST /api/create-link`.
3. The Express backend sends a request to Nomod's Create Link API.
4. Nomod returns the API response, including the generated payment link when successful.
5. The backend returns the result to the frontend.
6. The customer opens the Nomod-hosted checkout page.

### Nomod API Details

| Property | Details |
|---|---|
| Method | `POST` |
| Endpoint | `https://api.nomod.com/v1/links` |
| Authentication | `X-API-KEY` header |
| Local backend endpoint | `POST /api/create-link` |

Example authentication header:

```http
X-API-KEY: your_nomod_api_key
```

The backend is responsible for communicating with Nomod so the API key remains private.

## 🌍 Supported Currencies

According to the Create Link API reference used for this demo, the listed currencies are:

- AED – UAE Dirham
- USD – US Dollar
- EUR – Euro
- GBP – British Pound
- SAR – Saudi Riyal

INR is not listed for this endpoint in the referenced documentation. Confirm the latest API documentation and your account's supported currencies before testing.

## 🔐 Security Considerations

- Never commit `.env` files or API credentials.
- Do not place secret API keys in React components or browser JavaScript.
- Use `.env.example` to document required configuration without including real secrets.
- A generated payment link may be a real, payable link depending on your Nomod account and API key.
- Confirm whether your account supports a sandbox or test mode before making payments.
- Do not use real customer data or a live key unless you intend to create a real payment link.
- For production applications, verify payment status server-side through the appropriate Nomod API or webhook flow before marking an order as paid.

**Important:** Success and failure redirects are not proof that a payment succeeded or failed. Always verify the payment status through a trusted server-side source.

## 🐛 Troubleshooting

| Issue | Possible solution |
|---|---|
| `401 Unauthorized` | Verify the API key and confirm that API access is enabled. |
| `400 Bad Request` | Check the amount, currency, required fields, and account configuration. |
| `500` or connection error | Check your internet connection, backend logs, and Nomod API availability. |
| Payment URL is missing | Inspect the raw Nomod API response and confirm the response structure. |
| Application cannot connect to backend | Ensure the Express server is running and the frontend is using the correct backend URL. |
| Redirect does not work | Verify that the configured success and failure URLs match the application's routes. |

## 📚 Official Documentation

- [Nomod Official Website](https://nomod.com/)
- [API Introduction](https://nomod.com/docs/api-reference/introduction)
- [Create Payment Link API](https://nomod.com/docs/api-reference/generate-link)
- [API Authentication](https://nomod.com/docs/api-reference/authentication)
- [Hosted Checkout Documentation](https://www.nomodapp.com/docs/hosted-checkout)

Refer to the latest official documentation for current API requirements, supported currencies, authentication, and payment verification.

## ⚠️ Disclaimer

This repository is a **demonstration project** for exploring Nomod payment link integration. It is not a production-ready payment solution and does not guarantee that the account or API key operates in test mode.

Before using this integration in a live application, validate the API flow, secure all credentials, implement server-side payment verification, and follow Nomod's current integration requirements.

## 📄 License

No license has been specified for this repository. Add a license if you intend to permit others to reuse, modify, or distribute the code.
