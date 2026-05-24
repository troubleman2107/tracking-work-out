import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
sql`SELECT * FROM workout_exercises ORDER BY id DESC LIMIT 5`.then(res => {
  console.log(res);
}).catch(console.error);
