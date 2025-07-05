const bcrypt = require('bcrypt');

async function generateHash() {
  try {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Now let's update the database directly
    const mysql = require('mysql2/promise');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'seo_user',
      password: 'seo_password',
      database: 'seo_timeline'
    });
    
    await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hash, 'jaguzman123@hotmail.com']
    );
    
    console.log('✅ Password updated successfully in database!');
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generateHash().catch(console.error);
