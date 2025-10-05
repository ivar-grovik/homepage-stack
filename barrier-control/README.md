# Barrier Control Service

A Node.js service to monitor and control Barrier processes on the host system.

## Features

- Monitor barrier process status (server/client mode)
- Stop barrier processes remotely
- RESTful API compatible with homepage widgets
- Process information and health checking

## API Endpoints

- `GET /status/barrier-status` - Get current barrier status
- `POST /action/barrier-stop` - Stop all barrier processes  
- `GET /commands` - List available commands
- `GET /health` - Service health check

## Usage with Homepage

Add to your services.yaml:

```yaml
- System Management:
    - Barrier Control:
        icon: mdi-monitor-share
        widget:
          type: customapi
          url: http://barrier-control:3004/status/barrier-status
          refreshInterval: 10000
          mappings:
            - field: status
              label: "Status"
            - field: message  
              label: "Info"
            - field: mode
              label: "Mode"
```