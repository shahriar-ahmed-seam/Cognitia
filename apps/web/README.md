# Cognitia

A comprehensive study platform with features for notes, contests, model tests, and more.

## Running with Docker

### Prerequisites

- Docker
- Docker Compose

### Steps to Run

1. Clone the repository:
   \`\`\`bash
   git clone <repository-url>
   cd study-platform
   \`\`\`

2. Build and start the Docker container:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

3. Access the application at http://localhost:3000

### Stopping the Application

To stop the application, run:
\`\`\`bash
docker-compose down
\`\`\`

## Development

### Running Locally Without Docker

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Access the application at http://localhost:3000

### Building for Production

\`\`\`bash
npm run build
npm start
