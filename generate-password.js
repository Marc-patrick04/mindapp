const bcrypt = require('bcrypt');

// Change this to your desired password
const plainPassword = 'admin123';

// Generate hash with salt rounds (10 is standard)
bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) {
        console.error('Error generating hash:', err);
        return;
    }
    
    console.log('\n✅ Password generated successfully!\n');
    console.log('Plain password:', plainPassword);
    console.log('Bcrypt hash:', hash);
    console.log('\n📝 SQL to insert admin:\n');
    console.log(`INSERT INTO admins (email, password_hash) VALUES ('admin@mindapp.com', '${hash}');`);
    console.log('\n⚠️  Make sure to delete this file after use for security.\n');
});