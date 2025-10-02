import express from "express";
import { exec } from "child_process";
import { promisify } from "util";
import cors from "cors";

const app = express();
const PORT = 3003;
const execAsync = promisify(exec);

app.use(cors());
app.use(express.json());

// Configuration for allowed commands and their descriptions
const allowedCommands = {
  'system-status': {
    command: 'uptime',
    description: 'System uptime and load average',
    parser: (output) => {
      const match = output.match(/up\s+(.+?),\s+(\d+)\s+users?,\s+load average:\s+(.+)/);
      if (match) {
        return {
          status: 'online',
          uptime: match[1].trim(),
          users: match[2],
          load: match[3].trim(),
          message: 'Up ' + match[1].trim() + ', Load: ' + match[3].trim()
        };
      }
      return { status: 'unknown', message: output.trim() };
    }
  },
  'expressvpn-status': {
    command: '/opt/homepage-scripts/expressvpn-status.sh',
    description: 'ExpressVPN connection status',
    parser: (output) => {
      const status = output.trim().toLowerCase();
      if (status.includes('connected to')) {
        const locationMatch = output.match(/connected to (.+)/i);
        const location = locationMatch ? locationMatch[1].trim() : 'Unknown location';
        return {
          status: 'connected',
          location: location,
          message: 'Connected to ' + location,
          icon: '🟢'
        };
      } else if (status.includes('not connected') || status.includes('disconnected')) {
        return {
          status: 'disconnected',
          message: 'Not connected',
          icon: '🔴'
        };
      } else if (status.includes('connecting')) {
        return {
          status: 'connecting',
          message: 'Connecting...',
          icon: '🟡'
        };
      } else if (status.includes('service not available')) {
        return {
          status: 'service-unavailable',
          message: 'ExpressVPN service not running',
          icon: '❌'
        };
      } else {
        return {
          status: 'unknown',
          message: 'Status: ' + output.trim(),
          icon: '⚪'
        };
      }
    }
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'cmd-executor'
  });
});

// Get list of available commands
app.get('/commands', (req, res) => {
  const commands = Object.keys(allowedCommands).map(key => ({
    name: key,
    description: allowedCommands[key].description
  }));
  res.json({ commands });
});

// Execute a specific command
app.get('/status/:command', async (req, res) => {
  const commandName = req.params.command;
  
  if (!allowedCommands[commandName]) {
    return res.status(404).json({ 
      error: 'Command not found',
      available: Object.keys(allowedCommands)
    });
  }

  try {
    const commandConfig = allowedCommands[commandName];
    const { stdout, stderr } = await execAsync(commandConfig.command);
    
    if (stderr && !stdout) {
      return res.json({
        command: commandName,
        status: 'error',
        message: 'Error: ' + stderr.trim()
      });
    }

    const result = commandConfig.parser(stdout);
    
    res.json({
      command: commandName,
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    res.json({
      command: commandName,
      status: 'error',
      message: 'Failed to execute command: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ExpressVPN control endpoints
app.post('/expressvpn/connect', async (req, res) => {
  try {
    const { stdout, stderr } = await execAsync('/opt/homepage-scripts/expressvpn-connect.sh');
    
    if (stderr && stderr.includes('error')) {
      return res.json({
        success: false,
        message: 'Error: ' + stderr.trim(),
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'ExpressVPN connection initiated',
      output: stdout.trim(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.json({
      success: false,
      message: 'Failed to connect: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/expressvpn/disconnect', async (req, res) => {
  try {
    const { stdout, stderr } = await execAsync('/opt/homepage-scripts/expressvpn-disconnect.sh');
    
    if (stderr && stderr.includes('error')) {
      return res.json({
        success: false,
        message: 'Error: ' + stderr.trim(),
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'ExpressVPN disconnected',
      output: stdout.trim(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.json({
      success: false,
      message: 'Failed to disconnect: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log('Command executor service running on port ' + PORT);
  console.log('Available endpoints:');
  console.log('  GET /health - Health check');
  console.log('  GET /commands - List available commands');
  console.log('  GET /status/:command - Execute specific command');
  console.log('  POST /expressvpn/connect - Connect ExpressVPN');
  console.log('  POST /expressvpn/disconnect - Disconnect ExpressVPN');
  console.log('Available commands: ' + Object.keys(allowedCommands).join(', '));
});
