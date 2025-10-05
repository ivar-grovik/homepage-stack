import express from "express";
import { exec } from "child_process";
import { promisify } from "util";
import cors from "cors";

const app = express();
const PORT = 3004;
const execAsync = promisify(exec);

app.use(cors());
app.use(express.json());

// Helper function to get barrier processes
async function getBarrierProcesses() {
  try {
    // More specific search to avoid false positives from curl commands, etc.
    const { stdout } = await execAsync("ps aux | grep -E '(barrierc|barriers|/usr/bin/barrier)' | grep -v grep || echo 'No processes found'");
    const lines = stdout.trim().split('\n');
    
    if (lines.length === 1 && lines[0] === 'No processes found') {
      return [];
    }
    
    const processes = lines.filter(line => {
      // Filter out our own API calls and other false positives
      return !line.includes('curl') && 
             !line.includes('barrier-control') &&
             (line.includes('barrierc') || line.includes('barriers') || line.includes('/usr/bin/barrier'));
    }).map(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[1];
      const command = parts.slice(10).join(' ');
      
      return {
        pid: pid,
        command: command,
        type: command.includes('barrierc') ? 'client' : 
              command.includes('barriers') || command.includes('/usr/bin/barrier') ? 'server' : 'unknown'
      };
    });
    
    return processes;
  } catch (error) {
    console.error('Error getting barrier processes:', error);
    return [];
  }
}

// Helper function to parse barrier status
function parseBarrierStatus(processes) {
  const serverProc = processes.find(p => p.type === 'server');
  const clientProc = processes.find(p => p.type === 'client');
  
  let mode = 'stopped';
  let icon = '🔴';
  let message = 'Barrier is not running';
  
  if (serverProc && clientProc) {
    mode = 'both';
    icon = '🟢';
    message = `Running as server and client (${processes.length} processes)`;
  } else if (serverProc) {
    mode = 'server';
    icon = '🟡';
    message = 'Running as server only';
  } else if (clientProc) {
    mode = 'client';
    icon = '🟢';
    message = 'Running as client';
  } else if (processes.length > 0) {
    mode = 'unknown';
    icon = '🟡';
    message = `Unknown barrier mode (${processes.length} processes)`;
  }
  
  return {
    status: processes.length > 0 ? 'running' : 'stopped',
    mode: mode,
    processes: processes.length,
    server_active: !!serverProc,
    client_active: !!clientProc,
    message: message,
    icon: icon,
    details: processes
  };
}

// Configuration for allowed commands
const allowedCommands = {
  'barrier-status': {
    command: async () => {
      const processes = await getBarrierProcesses();
      return parseBarrierStatus(processes);
    },
    description: 'Barrier connection status and process information'
  },
  'barrier-stop': {
    command: async () => {
      try {
        const processes = await getBarrierProcesses();
        if (processes.length === 0) {
          return {
            status: 'not_running',
            message: 'Barrier is not running',
            icon: '🔴'
          };
        }
        
        // Kill all barrier processes
        const pids = processes.map(p => p.pid).join(' ');
        await execAsync(`kill ${pids}`);
        
        // Wait a moment and check again
        await new Promise(resolve => setTimeout(resolve, 1000));
        const remainingProcesses = await getBarrierProcesses();
        
        if (remainingProcesses.length === 0) {
          return {
            status: 'stopped',
            message: `Stopped ${processes.length} barrier processes`,
            icon: '🔴'
          };
        } else {
          return {
            status: 'partial_stop',
            message: `Stopped some processes, ${remainingProcesses.length} still running`,
            icon: '🟡'
          };
        }
      } catch (error) {
        return {
          status: 'error',
          message: `Error stopping barrier: ${error.message}`,
          icon: '❌'
        };
      }
    },
    description: 'Stop all barrier processes'
  }
};

// Generic status endpoint
app.get('/status/:command', async (req, res) => {
  const command = req.params.command;
  console.log(`[${new Date().toISOString()}] Status request for: ${command} from ${req.ip}`);
  
  if (!allowedCommands[command]) {
    return res.status(404).json({
      error: 'Command not found',
      available: Object.keys(allowedCommands)
    });
  }
  
  try {
    const result = await allowedCommands[command].command();
    console.log(`[${new Date().toISOString()}] Status result:`, result);
    res.json(result);
  } catch (error) {
    console.error(`Error executing ${command}:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Action endpoint for POST requests
app.post('/action/:command', async (req, res) => {
  const command = req.params.command;
  
  if (!allowedCommands[command]) {
    return res.status(404).json({
      error: 'Command not found',
      available: Object.keys(allowedCommands)
    });
  }
  
  try {
    const result = await allowedCommands[command].command();
    res.json(result);
  } catch (error) {
    console.error(`Error executing ${command}:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// List available commands
app.get('/commands', (req, res) => {
  const commands = Object.entries(allowedCommands).map(([name, config]) => ({
    name,
    description: config.description
  }));
  
  res.json({ commands });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'barrier-control',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Barrier Control API running on port ${PORT}`);
});

export default app;