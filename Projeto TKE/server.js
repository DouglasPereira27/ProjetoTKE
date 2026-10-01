require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// Configuração do Transportador de E-mail (SMTP / Office365 / Outlook / Gmail / Resend)
let mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  const isOffice365 = process.env.SMTP_HOST.includes('office365') || process.env.SMTP_HOST.includes('outlook');
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      ciphers: isOffice365 ? 'SSLv3' : undefined,
      rejectUnauthorized: false
    }
  });
  console.log(`📧 Serviço SMTP configurado (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || '587'})`);
  mailTransporter.verify((error, success) => {
    if (error) {
      console.warn(`⚠️ Aviso SMTP: Falha ao autenticar com ${process.env.SMTP_HOST}:`, error.message);
    } else {
      console.log(`✅ Servidor de e-mail SMTP conectado e pronto para envios automáticos!`);
    }
  });
} else if (process.env.SMTP_SERVICE && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log(`📧 Serviço SMTP configurado via serviço [${process.env.SMTP_SERVICE}]`);
  mailTransporter.verify((error, success) => {
    if (error) {
      console.warn(`⚠️ Aviso SMTP: Falha ao autenticar com ${process.env.SMTP_SERVICE}:`, error.message);
    } else {
      console.log(`✅ Servidor de e-mail SMTP conectado e pronto para envios automáticos!`);
    }
  });
} else {
  console.log('ℹ️ SMTP customizado aguardando SMTP_PASS no .env. Servidor de e-mail automático pronto para testes.');
}

async function sendResetEmail({ to, userName, token, otpCode, resetUrl }) {
  let transporter = mailTransporter;
  let isAutoTest = false;

  if (!transporter) {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const isOffice365 = process.env.SMTP_HOST.includes('office365') || process.env.SMTP_HOST.includes('outlook');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          ciphers: isOffice365 ? 'SSLv3' : undefined,
          rejectUnauthorized: false
        }
      });
      mailTransporter = transporter;
    } else {
      try {
        console.log('🔄 Provisionando servidor de e-mail SMTP automático...');
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        isAutoTest = true;
        mailTransporter = transporter;
        console.log(`📧 Servidor SMTP Automático provisionado com sucesso (${testAccount.user})!`);
      } catch (testErr) {
        console.warn('⚠️ Falha ao provisionar test account:', testErr.message);
      }
    }
  }

  if (!transporter) {
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
        .header p { margin: 4px 0 0; color: #ffedd5; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 28px 24px; }
        .greeting { font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
        .otp-box { background-color: #0f172a; border: 2px dashed #38bdf8; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 6px; }
        .otp-code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #10b981; margin: 4px 0; }
        .otp-expiry { font-size: 11px; color: #f59e0b; margin-top: 4px; }
        .btn-wrapper { text-align: center; margin: 26px 0; }
        .btn-reset { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff !important; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4); }
        .link-alt { font-size: 11.5px; color: #94a3b8; word-break: break-all; border-top: 1px solid #334155; padding-top: 16px; margin-top: 20px; }
        .link-alt a { color: #38bdf8; text-decoration: none; }
        .footer { background-color: #0f172a; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>TKE • PLANO 365</h1>
          <p>Engenharia de Manutenção & Confiabilidade</p>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${userName}!</div>
          <div class="text">
            Recebemos uma solicitação de redefinição de senha para sua conta corporativa no sistema <strong>PLANO 365</strong>.
          </div>

          <div class="otp-box">
            <div class="otp-label">Código de Verificação OTP</div>
            <div class="otp-code">${otpCode}</div>
            <div class="otp-expiry">⏱️ Válido por 30 minutos • Uso único</div>
          </div>

          <div class="btn-wrapper">
            <a href="${resetUrl}" class="btn-reset">👉 Redefinir Minha Senha Agora</a>
          </div>

          <div class="link-alt">
            Caso o botão acima não funcione, copie e cole o link seguro no seu navegador:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </div>
        </div>
        <div class="footer">
          Se você não solicitou a troca de senha, ignore este e-mail com segurança.<br>
          © 2026 TKE Elevator • Filiais 5003 / 5070 • Zona 2 - Norte
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const fromAddress = process.env.SMTP_FROM || `"TKE PLANO 365" <${process.env.SMTP_USER || 'plano365@tkelevator.com'}>`;
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `[PLANO 365] Recuperação de Senha - Código ${otpCode}`,
      html
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    console.log(`✉️ E-mail enviado com sucesso via SMTP para ${to}! MessageId: ${info.messageId}`);
    if (previewUrl) {
      console.log(`📬 Link de visualização do e-mail entregue: ${previewUrl}`);
    }
    return { sent: true, messageId: info.messageId, previewUrl, isAutoTest };
  } catch (err) {
    console.error(`❌ Erro ao enviar e-mail via SMTP para ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

// Conexão com o Neon PostgreSQL
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : null;

// Inicialização das tabelas no Neon se necessário
async function initNeonDatabase() {
  if (!pool) {
    console.warn('⚠️ DATABASE_URL não definida. O servidor rodará em modo de memória local.');
    return;
  }
  try {
    const client = await pool.connect();
    console.log('✅ Conectado com sucesso ao Neon PostgreSQL!');

    // Criar tabela de tokens de redefinição de senha
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(128) NOT NULL UNIQUE,
        codigo_otp VARCHAR(10),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela [password_reset_tokens] pronta no Neon.');
    client.release();
  } catch (err) {
    console.error('❌ Erro ao conectar ao Neon PostgreSQL:', err.message);
  }
}

initNeonDatabase();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4'
};

function hashSha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('JSON Inválido'));
      }
    });
    req.on('error', reject);
  });
}

function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Router de API
async function handleApiRequest(req, res, pathname) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  // 1. Health check & status do Neon
  if (pathname === '/api/health' && req.method === 'GET') {
    let neonStatus = 'offline';
    let userCount = 0;
    let tokenCount = 0;

    if (pool) {
      try {
        const uRes = await pool.query('SELECT COUNT(*) FROM usuarios;');
        const tRes = await pool.query('SELECT COUNT(*) FROM password_reset_tokens;');
        userCount = parseInt(uRes.rows[0].count, 10);
        tokenCount = parseInt(tRes.rows[0].count, 10);
        neonStatus = 'connected';
      } catch (e) {
        neonStatus = 'error: ' + e.message;
      }
    }

    sendJsonResponse(res, 200, {
      status: 'ok',
      database: 'Neon PostgreSQL',
      neonStatus,
      usersInDb: userCount,
      tokensInDb: tokenCount,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // 2. POST /api/auth/forgot-password -> Gera token seguro e OTP e salva no Neon
  if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
    try {
      const { identifier, destinationEmail } = await parseJsonBody(req);
      if (!identifier) {
        sendJsonResponse(res, 400, { success: false, message: 'Identificador (usuário, e-mail ou matrícula) é obrigatório.' });
        return true;
      }

      const cleanId = String(identifier).trim().toLowerCase();
      let user = null;

      if (pool) {
        const userQuery = `
          SELECT id, username, email, matricula, nome, cargo, filial, setor, avatar, role
          FROM usuarios 
          WHERE LOWER(username) = $1 OR LOWER(email) = $1 OR matricula = $1
          LIMIT 1;
        `;
        const userRes = await pool.query(userQuery, [cleanId]);
        if (userRes.rows.length > 0) {
          user = userRes.rows[0];
        }
      }

      // Se não encontrou no banco mas foi fornecido identificador
      if (!user) {
        sendJsonResponse(res, 404, { success: false, message: 'Colaborador não encontrado no cadastro do PLANO 365.' });
        return true;
      }

      const targetEmail = (destinationEmail || user.email || `${user.username}@tkelevator.com`).trim().toLowerCase();

      // Gerar Token Criptográfico (32 bytes hex) e OTP de 6 dígitos numéricos
      const token = 'tke_rst_' + crypto.randomBytes(24).toString('hex');
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

      if (pool) {
        // Invalida tokens anteriores não usados desse usuário
        await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false;', [user.id]);

        // Insere novo token no Neon
        await pool.query(`
          INSERT INTO password_reset_tokens (user_id, email, token, codigo_otp, expires_at, used)
          VALUES ($1, $2, $3, $4, $5, false);
        `, [user.id, targetEmail, token, otpCode, expiresAt]);
      }

      // Mascarar e-mail para privacidade
      const parts = targetEmail.split('@');
      const namePart = parts[0];
      const domainPart = parts[1] || 'tkelevator.com';
      const maskedEmail = (namePart.length > 3 ? namePart.slice(0, 3) + '***' + namePart.slice(-1) : namePart[0] + '***') + '@' + domainPart;

      const origin = `http://${req.headers.host || 'localhost:3000'}`;
      const resetUrl = `${origin}/?reset_token=${encodeURIComponent(token)}`;

      // Disparar envio de e-mail seguro se SMTP estiver configurado
      const emailResult = await sendResetEmail({
        to: targetEmail,
        userName: user.nome || user.username,
        token,
        otpCode,
        resetUrl
      });

      const responseData = {
        success: true,
        message: emailResult.sent 
          ? `Link de redefinição de senha enviado com sucesso para a caixa de entrada de ${targetEmail}.`
          : `Token registrado no Neon. Para envio à caixa de entrada @tkelevator.com, configure o SMTP_PASS no .env.`,
        email: targetEmail,
        maskedEmail: maskedEmail,
        emailSent: !!emailResult.sent,
        emailError: emailResult.error || (emailResult.reason === 'SMTP_NOT_CONFIGURED' ? 'SMTP_NOT_CONFIGURED' : null),
        smtpConfigured: !!mailTransporter,
        previewUrl: emailResult.previewUrl || null,
        isAutoTest: !!emailResult.isAutoTest,
        expiresAt: expiresAt.toISOString(),
        token: token,
        otp: otpCode,
        resetUrl: resetUrl,
        user: {
          id: user.id,
          username: user.username,
          nome: user.nome,
          matricula: user.matricula,
          cargo: user.cargo,
          avatar: user.avatar
        }
      };

      sendJsonResponse(res, 200, responseData);
      return true;
    } catch (err) {
      console.error('Erro em forgot-password:', err);
      sendJsonResponse(res, 500, { success: false, message: 'Erro interno ao gerar token de recuperação: ' + err.message });
      return true;
    }
  }

  // 3. POST /api/auth/validate-token -> Valida token ou OTP no Neon
  if (pathname === '/api/auth/validate-token' && req.method === 'POST') {
    try {
      const { token, otp, identifier } = await parseJsonBody(req);
      if (!token && !otp) {
        sendJsonResponse(res, 400, { success: false, message: 'Token ou código OTP não informado.' });
        return true;
      }

      if (!pool) {
        sendJsonResponse(res, 500, { success: false, message: 'Banco de dados Neon não disponível.' });
        return true;
      }

      let query = '';
      let params = [];

      if (token) {
        query = `
          SELECT t.id, t.user_id, t.email, t.token, t.codigo_otp, t.expires_at, t.used,
                 u.username, u.nome, u.matricula, u.cargo, u.avatar, u.role, u.filial, u.setor
          FROM password_reset_tokens t
          JOIN usuarios u ON u.id = t.user_id
          WHERE t.token = $1
          LIMIT 1;
        `;
        params = [String(token).trim()];
      } else if (otp && identifier) {
        query = `
          SELECT t.id, t.user_id, t.email, t.token, t.codigo_otp, t.expires_at, t.used,
                 u.username, u.nome, u.matricula, u.cargo, u.avatar, u.role, u.filial, u.setor
          FROM password_reset_tokens t
          JOIN usuarios u ON u.id = t.user_id
          WHERE t.codigo_otp = $1 AND (LOWER(u.username) = $2 OR LOWER(u.email) = $2 OR u.matricula = $2)
          ORDER BY t.created_at DESC
          LIMIT 1;
        `;
        params = [String(otp).trim(), String(identifier).trim().toLowerCase()];
      }

      const resDb = await pool.query(query, params);

      if (resDb.rows.length === 0) {
        sendJsonResponse(res, 404, { success: false, message: 'Token de recuperação não encontrado ou inválido.' });
        return true;
      }

      const row = resDb.rows[0];

      if (row.used) {
        sendJsonResponse(res, 400, { success: false, message: 'Este token já foi utilizado anteriormente.' });
        return true;
      }

      if (new Date(row.expires_at) < new Date()) {
        sendJsonResponse(res, 400, { success: false, message: 'Este token expirou (validade máxima de 30 minutos). Solicite um novo.' });
        return true;
      }

      sendJsonResponse(res, 200, {
        success: true,
        message: 'Token válido e ativo no Neon.',
        token: row.token,
        user: {
          id: row.user_id,
          username: row.username,
          email: row.email,
          nome: row.nome,
          matricula: row.matricula,
          cargo: row.cargo,
          avatar: row.avatar,
          role: row.role,
          filial: row.filial,
          setor: row.setor
        }
      });
      return true;
    } catch (err) {
      console.error('Erro em validate-token:', err);
      sendJsonResponse(res, 500, { success: false, message: 'Erro ao validar token no Neon: ' + err.message });
      return true;
    }
  }

  // 4. POST /api/auth/reset-password -> Redefine a senha e sincroniza no Neon
  if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
    try {
      const { token, newPassword, confirmPassword } = await parseJsonBody(req);
      if (!token || !newPassword) {
        sendJsonResponse(res, 400, { success: false, message: 'Token e nova senha são obrigatórios.' });
        return true;
      }

      if (newPassword.length < 8) {
        sendJsonResponse(res, 400, { success: false, message: 'A nova senha deve ter no mínimo 8 caracteres.' });
        return true;
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        sendJsonResponse(res, 400, { success: false, message: 'A confirmação de senha não confere.' });
        return true;
      }

      if (!pool) {
        sendJsonResponse(res, 500, { success: false, message: 'Banco Neon não configurado.' });
        return true;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Busca o token
        const tokenRes = await client.query(`
          SELECT id, user_id, email, expires_at, used
          FROM password_reset_tokens
          WHERE token = $1 FOR UPDATE;
        `, [String(token).trim()]);

        if (tokenRes.rows.length === 0) {
          await client.query('ROLLBACK');
          sendJsonResponse(res, 404, { success: false, message: 'Token inválido ou inexistente.' });
          return true;
        }

        const tokenRow = tokenRes.rows[0];

        if (tokenRow.used) {
          await client.query('ROLLBACK');
          sendJsonResponse(res, 400, { success: false, message: 'Este token já foi utilizado.' });
          return true;
        }

        if (new Date(tokenRow.expires_at) < new Date()) {
          await client.query('ROLLBACK');
          sendJsonResponse(res, 400, { success: false, message: 'Token expirado. Solicite um novo link.' });
          return true;
        }

        const newHash = hashSha256(newPassword);

        // Atualiza usuário no Neon
        const updateUserRes = await client.query(`
          UPDATE usuarios
          SET senha_hash = $1,
              senha_provisoria = NULL,
              primeiro_acesso = false,
              atualizado_em = NOW()
          WHERE id = $2
          RETURNING id, username, email, matricula, nome, role, cargo, filial, setor, avatar;
        `, [newHash, tokenRow.user_id]);

        // Marca token como utilizado
        await client.query(`
          UPDATE password_reset_tokens
          SET used = true
          WHERE id = $1;
        `, [tokenRow.id]);

        await client.query('COMMIT');

        const updatedUser = updateUserRes.rows[0];

        sendJsonResponse(res, 200, {
          success: true,
          message: 'Senha redefinida com sucesso no Neon! Você já pode acessar com suas novas credenciais.',
          user: updatedUser
        });
        return true;
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Erro em reset-password:', err);
      sendJsonResponse(res, 500, { success: false, message: 'Erro ao redefinir senha no Neon: ' + err.message });
      return true;
    }
  }

  // 5. GET /api/auth/tokens -> Auditoria de tokens gerados no Neon (Supervisor/Master)
  if (pathname === '/api/auth/tokens' && req.method === 'GET') {
    try {
      if (!pool) {
        sendJsonResponse(res, 500, { success: false, message: 'Neon Postgres não disponível.' });
        return true;
      }
      const tokensRes = await pool.query(`
        SELECT t.id, t.user_id, t.email, t.codigo_otp, t.token, t.expires_at, t.used, t.created_at,
               u.nome, u.username, u.matricula, u.role, u.setor
        FROM password_reset_tokens t
        LEFT JOIN usuarios u ON u.id = t.user_id
        ORDER BY t.created_at DESC
        LIMIT 50;
      `);
      sendJsonResponse(res, 200, {
        success: true,
        tokens: tokensRes.rows
      });
      return true;
    } catch (err) {
      sendJsonResponse(res, 500, { success: false, message: err.message });
      return true;
    }
  }

  return false;
}

// Servidor HTTP Principal
const server = http.createServer(async (req, res) => {
  const urlParts = req.url.split('?');
  const pathname = decodeURIComponent(urlParts[0]);

  // Se for requisição para a API
  if (pathname.startsWith('/api/')) {
    const handled = await handleApiRequest(req, res, pathname);
    if (handled) return;
  }

  // Servir arquivos estáticos
  let safePath = pathname === '/' || pathname === '' ? '/index.html' : pathname;
  let filePath = path.join(__dirname, safePath);

  // Prevenir Directory Traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor TKE • PLANO 365 rodando com sucesso!`);
  console.log(`🌐 Acesse no seu navegador: http://localhost:${PORT}`);
  console.log(`🗄️ Neon PostgreSQL integrado e pronto para tokens e redefinições de senha.\n`);
});
