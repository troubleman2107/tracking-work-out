import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workout_exercises'`.then(res => {
  console.log(res);
}).catch(console.error);
