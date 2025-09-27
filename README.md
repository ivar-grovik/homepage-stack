# Homepage Stack

A Docker-based stack for running a Line 2 transit proxy service with Homepage dashboard integration.

## Overview

This project provides a proxy server for Line 2 bus departure information that can be consumed by Homepage dashboard widgets. The stack includes:

- **line2-proxy**: A Node.js Express server that provides transit departure data
- **Docker Compose**: Orchestration for easy deployment

## Structure

```
homepage-stack/
├── docker-compose.yml          # Docker Compose configuration
├── README.md                   # This file
├── .gitignore                  # Git ignore rules
└── line2-proxy/               # Proxy service directory
    ├── Dockerfile             # Docker build configuration
    ├── package.json           # Node.js dependencies
    └── server.js              # Express server implementation
```

## Features

- **RESTful API**: Provides Line 2 departure data at `/line2` endpoint
- **CORS Enabled**: Cross-origin resource sharing for web dashboard integration
- **Health Check**: Status endpoint at `/health`
- **Docker Ready**: Containerized for easy deployment
- **Homepage Compatible**: Data format matches Homepage widget expectations

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 16+ (for local development)

### Running with Docker Compose

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd homepage-stack
   ```
3. Start the services:
   ```bash
   docker-compose up -d
   ```
4. Access the API:
   - Line 2 data: `http://localhost:3000/line2`
   - Health check: `http://localhost:3000/health`

### Running Locally (Development)

1. Navigate to the line2-proxy directory:
   ```bash
   cd line2-proxy
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### GET /line2

Returns current Line 2 departure information in the format expected by Homepage widgets.

**Response Format:**
```json
{
  "stop": "Central Station",
  "departures": [
    {
      "destinationDisplay": {
        "frontText": "Downtown Terminal"
      },
      "expectedDepartureTime": "2025-09-27T14:30:00.000Z"
    },
    {
      "destinationDisplay": {
        "frontText": "Airport"
      },
      "expectedDepartureTime": "2025-09-27T14:37:00.000Z"
    }
  ]
}
```

### GET /health

Returns service health status.

**Response Format:**
```json
{
  "status": "OK",
  "timestamp": "2025-09-27T14:25:00.000Z"
}
```

## Homepage Integration

This service is designed to work with Homepage dashboard widgets. Add the following configuration to your `widgets.yaml`:

```yaml
- widget:
    type: customapi
    url: http://line2-proxy:3000/line2
    method: GET
    refreshInterval: 60000
    mappings:
        - field: stop
        label: "🚌 Stop"
        format: text
        - field: departures[0].destinationDisplay.frontText
        label: "→ Destination"
        format: text
        - field: departures[0].expectedDepartureTime
        label: "⏰ Next (Line 2)"
        format: relativeDate
        - field: departures[1].destinationDisplay.frontText
        label: "→ Destination"
        format: text
        - field: departures[1].expectedDepartureTime
        label: "⏰ Following (Line 2)"
        format: relativeDate
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Customization

To integrate with actual transit APIs:

1. Edit `line2-proxy/server.js`
2. Replace the mock data section with actual API calls
3. Update the API endpoint URL in the `/line2` route
4. Add any required authentication or headers

Example:
```javascript
app.get('/line2', async (req, res) => {
  try {
    const response = await axios.get('YOUR_ACTUAL_TRANSIT_API_ENDPOINT', {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    });
    res.json(response.data);
  } catch (error) {
    // Error handling...
  }
});
```

## Development

### Scripts

- `npm start`: Start the production server
- `npm run dev`: Start with nodemon for development (auto-restart)

### Docker Development

Build and run the container locally:

```bash
# Build the image
docker build -t line2-proxy ./line2-proxy

# Run the container
docker run -p 3000:3000 line2-proxy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the logs: `docker-compose logs line2-proxy`
- Verify the service is running: `docker-compose ps`
- Test the health endpoint: `curl http://localhost:3000/health`