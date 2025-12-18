import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import axios from 'axios';

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const SESSION_SECRET = process.env.SESSION_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables at startup
function validateEnvironment() {
  const required = ['CORS_ORIGIN', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set these in your .env file');
    process.exit(1);
  }
}

validateEnvironment();

// CORS configuration with strict options
const corsOptions = {
  origin: CORS_ORIGIN?.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(
  session({
    secret: SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      secure: NODE_ENV === 'production',
      httpOnly: true,
      sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// Extend Express session to include custom properties
declare global {
  namespace Express {
    interface Session {
      jira?: {
        baseUrl: string;
        email: string;
        apiToken: string;
      };
      servicenow?: {
        instanceUrl: string;
        username: string;
        password: string;
      };
    }
  }
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

/**
 * POST /api/jira/connect
 * Stores Jira credentials in session and validates connection
 */
app.post('/api/jira/connect', async (req: Request, res: Response) => {
  try {
    const { baseUrl, email, apiToken } = req.body;

    if (!baseUrl || !email || !apiToken) {
      return res.status(400).json({ error: 'Missing required fields: baseUrl, email, apiToken' });
    }

    // Test connection to Jira
    const testUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const credentials = btoa(`${email}:${apiToken}`);

    const response = await axios.get(`${testUrl}rest/api/3/myself`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    });

    // Store in session
    if (req.session) {
      (req.session as any).jira = { baseUrl, email, apiToken };
    }

    res.json({
      success: true,
      message: `Connected to Jira as ${response.data.displayName || email}`,
      user: response.data.displayName || email,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(401).json({ error: `Jira connection failed: ${errorMessage}` });
  }
});

/**
 * GET /api/jira/stories
 * Fetch user stories from Jira using session-stored credentials
 */
app.get('/api/jira/stories', async (req: Request, res: Response) => {
  try {
    const jiraSession = (req.session as any).jira;
    if (!jiraSession) {
      return res.status(401).json({ error: 'Not connected to Jira. Call /api/jira/connect first.' });
    }

    const { baseUrl, email, apiToken } = jiraSession;
    const searchQuery = req.query.q || 'type=Story';

    const testUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const credentials = btoa(`${email}:${apiToken}`);

    const response = await axios.get(
      `${testUrl}rest/api/3/search?jql=${encodeURIComponent(searchQuery as string)}&maxResults=50`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
      }
    );

    const stories = (response.data.issues || []).map((issue: any) => ({
      id: issue.key,
      key: issue.key,
      title: issue.fields.summary,
      description: extractDescription(issue.fields.description),
      acceptanceCriteria: issue.fields.customfield_10000 ? extractDescription(issue.fields.customfield_10000) : undefined,
      status: issue.fields.status?.name || 'Unknown',
      priority: issue.fields.priority?.name || 'Medium',
      assignee: issue.fields.assignee?.displayName,
      source: 'jira' as const,
    }));

    res.json({ stories });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to fetch Jira stories: ${errorMessage}` });
  }
});

/**
 * POST /api/servicenow/connect
 * Stores ServiceNow credentials in session and validates connection to rm_story table
 * Body: { instanceUrl, username, password }
 */
app.post('/api/servicenow/connect', async (req: Request, res: Response) => {
  try {
    const { instanceUrl, username, password } = req.body;
    
    console.log('[ServiceNow Connect] Request received:', { instanceUrl, username });

    if (!instanceUrl || !username || !password) {
      console.log('[ServiceNow Connect] Missing fields:', { instanceUrl: !!instanceUrl, username: !!username, password: !!password });
      return res.status(400).json({ error: 'Missing required fields: instanceUrl, username, password' });
    }

    // Validate URL format
    try {
      new URL(instanceUrl);
    } catch (urlError) {
      console.log('[ServiceNow Connect] Invalid URL format:', instanceUrl);
      return res.status(400).json({ error: 'Invalid instanceUrl format' });
    }

    // Test connection to ServiceNow
    const testUrl = instanceUrl.endsWith('/') ? instanceUrl : `${instanceUrl}/`;
    const credentials = btoa(`${username}:${password}`);
    
    console.log('[ServiceNow Connect] Testing connection to:', `${testUrl}api/now/table/sys_user`);

    const response = await axios.get(`${testUrl}api/now/table/sys_user?sysparm_limit=1`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
      timeout: 15000, // 15 second timeout for production
    });

    // Validate response structure
    if (!response.data || !Array.isArray(response.data.result)) {
      console.log('[ServiceNow Connect] Invalid response format:', typeof response.data);
      return res.status(500).json({ error: 'Invalid ServiceNow response format' });
    }

    // Store in session
    if (req.session) {
      (req.session as any).servicenow = { instanceUrl, username, password };
    }
    
    console.log('[ServiceNow Connect] Successfully connected');

    res.json({
      success: true,
      message: 'Connected to ServiceNow successfully',
      recordCount: response.data.result?.length || 0,
    });
  } catch (error) {
    console.error('[ServiceNow Connect] Error:', error);
    if (error instanceof axios.AxiosError) {
      if (error.response?.status === 401) {
        return res.status(401).json({ error: 'ServiceNow authentication failed. Check username and password.' });
      }
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ error: 'ServiceNow connection timeout. Check instanceUrl.' });
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return res.status(400).json({ error: 'Cannot reach ServiceNow instance. Check instanceUrl.' });
      }
      const errorMessage = error.response?.data?.error?.message || error.message;
      return res.status(error.response?.status || 500).json({ error: `ServiceNow error: ${errorMessage}` });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Connection failed: ${errorMessage}` });
  }
});

/**
 * GET /api/servicenow/stories
 * Fetch user stories from ServiceNow rm_story table using session-stored credentials
 * Query param: q (optional ServiceNow query syntax)
 */
app.get('/api/servicenow/stories', async (req: Request, res: Response) => {
  try {
    const snowSession = (req.session as any).servicenow;
    if (!snowSession) {
      return res.status(401).json({ error: 'Not connected to ServiceNow. Call /api/servicenow/connect first.' });
    }

    const { instanceUrl, username, password } = snowSession;
    const queryParam = req.query.q || 'state!=7^ORDERBYDESCsys_created_on'; // Exclude closed stories, order by created date

    const testUrl = instanceUrl.endsWith('/') ? instanceUrl : `${instanceUrl}/`;
    const credentials = btoa(`${username}:${password}`);

    const response = await axios.get(
      `${testUrl}api/now/table/rm_story?sysparm_limit=50&sysparm_query=${encodeURIComponent(queryParam as string)}&sysparm_fields=sys_id,number,short_description,description,state,priority,acceptance_criteria,epic`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
        timeout: 15000, // 15 second timeout for production
      }
    );

    // Validate response structure
    if (!response.data || !Array.isArray(response.data.result)) {
      return res.status(500).json({ error: 'Invalid ServiceNow response format' });
    }

    const statusMap: Record<string, string> = {
      '1': 'New',
      '2': 'In Progress',
      '3': 'On Hold',
      '4': 'Resolved',
      '5': 'Closed',
      '6': 'Cancelled',
      '7': 'Closed',
    };

    const priorityMap: Record<string, string> = {
      '1': 'Critical',
      '2': 'High',
      '3': 'Medium',
      '4': 'Low',
      '5': 'Planning',
    };

    const stories = await Promise.all(
      response.data.result.map(async (story: any) => {
        console.log('ServiceNow Story Fields:', Object.keys(story));
        
        let epicNumber = undefined;
        let epicTitle = undefined;
        
        // If story has an epic, fetch epic details
        if (story.epic && story.epic.value) {
          try {
            const epicResponse = await axios.get(
              `${testUrl}api/now/table/rm_epic?sysparm_limit=1&sysparm_query=sys_id=${story.epic.value}&sysparm_fields=number,short_description`,
              {
                headers: {
                  Authorization: `Basic ${credentials}`,
                  Accept: 'application/json',
                },
                timeout: 5000,
              }
            );
            
            if (epicResponse.data.result && epicResponse.data.result.length > 0) {
              const epic = epicResponse.data.result[0];
              epicNumber = epic.number;
              epicTitle = epic.short_description;
            }
          } catch (epicError) {
            console.log('Failed to fetch epic details:', epicError);
          }
        }
        
        return {
          id: story.sys_id,
          key: story.number,
          title: story.short_description || 'Untitled',
          description: story.description || '',
          acceptanceCriteria: story.acceptance_criteria || undefined,
          status: statusMap[story.state] || 'Unknown',
          priority: priorityMap[story.priority] || 'Medium',
          assignee: story.assigned_to?.display_value || undefined,
          epicKey: epicNumber,
          epicTitle: epicTitle,
          source: 'servicenow' as const,
        };
      })
    );

    res.json({ stories });
  } catch (error) {
    if (error instanceof axios.AxiosError) {
      if (error.response?.status === 401) {
        return res.status(401).json({ error: 'ServiceNow authentication failed. Invalid credentials.' });
      }
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ error: 'ServiceNow request timeout. Service may be slow.' });
      }
      const errorMessage = error.response?.data?.error?.message || error.message;
      return res.status(error.response?.status || 500).json({ error: `ServiceNow error: ${errorMessage}` });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to fetch ServiceNow stories: ${errorMessage}` });
  }
});


// Extract description helper
function extractDescription(desc: any): string {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  if (desc.content && Array.isArray(desc.content)) {
    return desc.content
      .map((block: any) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content.map((item: any) => item.text || '').join('');
        }
        return '';
      })
      .join('\n');
  }
  return '';
}

// Global error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const isDevelopment = NODE_ENV === 'development';
  
  console.error(`[${new Date().toISOString()}] ${status} Error:`, err.message);
  
  res.status(status).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
});

// Start server
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Backend listening on http://127.0.0.1:${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🔒 Session Secret: ${SESSION_SECRET ? 'configured' : 'MISSING!'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
