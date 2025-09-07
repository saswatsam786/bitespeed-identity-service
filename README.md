# Bitespeed Identity Reconciliation Service

A Node.js microservice for customer identity reconciliation that links different contact information (email and phone) to the same customer across multiple purchases.

## 🚀 Features

- **Identity Linking**: Automatically links customers based on shared email or phone number
- **Primary/Secondary Contact Management**: Maintains contact hierarchy with oldest contact as primary
- **Contact Consolidation**: Returns unified view of all customer contact information
- **RESTful API**: Simple POST endpoint for identity resolution
- **Production Ready**: Includes logging, error handling, health checks, and monitoring
- **Dockerized**: Easy deployment with Docker and docker-compose
- **TypeScript**: Full TypeScript support with type safety

## 🏗️ Architecture

- **Framework**: Node.js with Express and TypeScript
- **Database**: PostgreSQL with connection pooling
- **Architecture Pattern**: Layered architecture (Controllers → Services → Models)
- **ORM**: Raw SQL queries with custom model classes
- **Containerization**: Docker with multi-stage builds
- **Security**: Helmet for security headers, CORS support

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL (if running locally without Docker)

## 🛠️ Installation & Setup

### Option 1: Using Docker (Recommended)

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd identity-service-bitespeed
```

2. **Start the application**

```bash
docker-compose up --build
```

This will:

- Start PostgreSQL database
- Run database migrations
- Start the application on port 3000

### Option 2: Local Development

1. **Clone and install dependencies**

```bash
git clone <your-repo-url>
cd identity-service-bitespeed
npm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your database configuration
```

3. **Start PostgreSQL database**

```bash
docker-compose up postgres
```

4. **Run migrations**

```bash
npm run migrate
```

5. **Seed sample data (optional)**

```bash
npm run seed
```

6. **Start development server**

```bash
npm run dev
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bitespeed_identity
DB_USER=postgres
DB_PASSWORD=password
DB_MAX_CONNECTIONS=20
LOG_LEVEL=info
# OR
DB_URL=

```

## 📚 API Documentation

### POST /identify

Identifies and consolidates customer contact information.

**Request Body:**

```json
{
  "email": "customer@example.com", // Optional
  "phoneNumber": "1234567890" // Optional
}
```

**Response:**

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["first@example.com", "second@example.com"],
    "phoneNumbers": ["1234567890", "0987654321"],
    "secondaryContactIds": [2, 3]
  }
}
```

**Example Requests:**

Create new contact:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'
```

Link existing contact:

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

### GET /health

Returns service health status.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2023-04-01T00:00:00.000Z",
  "service": "bitespeed-identity-service"
}
```

## 🚀 Deployment

### Using Docker

1. **Build production image**

```bash
docker build -t bitespeed-identity-service .
```

2. **Run with database**

```bash
docker-compose up
```

### Manual Deployment

1. **Build the application**

```bash
npm run build
```

2. **Start production server**

```bash
NODE_ENV=production npm start
```

## 📊 Database Schema

```sql
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    linked_id INTEGER REFERENCES contacts(id),
    link_precedence VARCHAR(20) NOT NULL CHECK (link_precedence IN ('primary', 'secondary')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);
```

**Indexes for Performance:**

- `idx_contacts_email` - On email field (where deleted_at IS NULL)
- `idx_contacts_phone_number` - On phone_number field (where deleted_at IS NULL)
- `idx_contacts_linked_id` - On linked_id field (where deleted_at IS NULL)
- `idx_contacts_link_precedence` - On link_precedence field (where deleted_at IS NULL)

## 🔍 Business Logic

### Contact Linking Rules

1. **New Contact**: Creates primary contact when no matching email/phone exists
2. **Secondary Contact**: Creates secondary contact when partial match found with new information
3. **Primary Merge**: Converts newer primary to secondary when two primaries need linking
4. **Consolidation**: Returns unified view of all linked contacts

### Example Scenarios

**Scenario 1: New Customer**

- Request: `{"email": "new@example.com", "phoneNumber": "123456"}`
- Result: Creates new primary contact

**Scenario 2: Returning Customer with New Email**

- Existing: `{"email": "old@example.com", "phoneNumber": "123456"}`
- Request: `{"email": "new@example.com", "phoneNumber": "123456"}`
- Result: Creates secondary contact linked to existing primary

**Scenario 3: Merging Two Customers**

- Existing 1: `{"email": "user1@example.com", "phoneNumber": "111111"}`
- Existing 2: `{"email": "user2@example.com", "phoneNumber": "222222"}`
- Request: `{"email": "user1@example.com", "phoneNumber": "222222"}`
- Result: Links both contacts, older becomes primary

## 📈 Performance Considerations

- Database indexes on email, phone_number, and linked_id fields
- Connection pooling for database efficiency
- Proper error handling and logging
- Health check endpoint for monitoring
- Docker multi-stage builds for smaller images
- Compression middleware for response optimization

## 🛠️ Development Scripts

```bash
# Development
npm run dev          # Start development server with nodemon
npm run watch        # Watch TypeScript compilation
npm run build        # Build for production

# Database
npm run migrate      # Run database migrations
npm run seed         # Seed sample data
npm run reset        # Reset database
```

## 🐛 Debugging

**View logs**

```bash
docker-compose logs -f bitespeed-identity-service
```

**Connect to database**

```bash
docker-compose exec postgres psql -U postgres -d bitespeed_identity
```

## 📁 Project Structure

```
src/
├── controllers/          # API route handlers
│   └── identity-controller.ts
├── database/            # Database configuration and migrations
│   ├── connection.ts
│   ├── migrate.ts
    ├── reset.ts
    ├── seed.ts
│   ├── migrations/
│   ├── seeds/
│   └── reset/
├── dto/                 # Data Transfer Objects
│   ├── database-namespace.ts
│   └── internal-namespace.ts
├── models/              # Database models
│   └── contact.ts
├── services/            # Business logic
│   └── identity-service.ts
├── utils/               # Utility functions
│   └── logger.ts
├── app.ts              # Express app configuration
└── index.ts            # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat/fix/reafactor: Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the ISC License - see the package.json file for details.

## 🆘 Support

For support, please create an issue in the repository or contact the development team.

**Live Demo:** https://bitespeed-identity-service-sxji.onrender.com/  
**Repository:** https://github.com/saswatsam786/bitespeed-identity-service

---

**Author:** Saswat Samal  
**Version:** 1.0.0
