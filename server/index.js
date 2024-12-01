export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Login endpoint
      if (path === '/api/login' && request.method === 'POST') {
        const { username, password } = await request.json();
        
        const user = await env.DB.prepare(
          'SELECT id, username, role FROM users WHERE username = ? AND password = ?'
        )
        .bind(username, password)
        .first();

        if (!user) {
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }), 
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = createJWT(user);
        return new Response(
          JSON.stringify({ token, user }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify JWT for protected routes
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.split(' ')[1];
      const user = verifyJWT(token);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }), 
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get scouts
      if (path === '/api/scouts' && request.method === 'GET') {
        const scouts = await env.DB.prepare('SELECT * FROM scouts').all();
        return new Response(
          JSON.stringify(scouts.results), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add scout
      if (path === '/api/scouts' && request.method === 'POST') {
        if (!['admin', 'editor'].includes(user.role)) {
          return new Response(
            JSON.stringify({ error: 'Insufficient permissions' }), 
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { name } = await request.json();
        const result = await env.DB.prepare(
          'INSERT INTO scouts (name, balance) VALUES (?, 0) RETURNING *'
        )
        .bind(name)
        .first();

        return new Response(
          JSON.stringify(result), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get transactions
      if (path.match(/\/api\/scouts\/\d+\/transactions/) && request.method === 'GET') {
        const scoutId = path.split('/')[3];
        const transactions = await env.DB.prepare(
          'SELECT * FROM transactions WHERE scout_id = ? ORDER BY date DESC'
        )
        .bind(scoutId)
        .all();

        return new Response(
          JSON.stringify(transactions.results), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add transaction
      if (path.match(/\/api\/scouts\/\d+\/transactions/) && request.method === 'POST') {
        if (!['admin', 'editor'].includes(user.role)) {
          return new Response(
            JSON.stringify({ error: 'Insufficient permissions' }), 
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const scoutId = path.split('/')[3];
        const { description, amount, category, date } = await request.json();

        await env.DB.prepare(
          'BEGIN TRANSACTION'
        ).run();

        try {
          const transaction = await env.DB.prepare(
            'INSERT INTO transactions (scout_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?) RETURNING *'
          )
          .bind(scoutId, description, amount, category, date)
          .first();

          await env.DB.prepare(
            'UPDATE scouts SET balance = balance + ? WHERE id = ?'
          )
          .bind(amount, scoutId)
          .run();

          await env.DB.prepare('COMMIT').run();

          return new Response(
            JSON.stringify(transaction), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          await env.DB.prepare('ROLLBACK').run();
          throw error;
        }
      }

      // Similar modifications for other endpoints...

      return new Response(
        JSON.stringify({ error: 'Not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
};

// JWT helper functions
function createJWT(user) {
  // Implement JWT creation
}

function verifyJWT(token) {
  // Implement JWT verification
} 