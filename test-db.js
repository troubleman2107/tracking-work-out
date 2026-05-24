import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
sql('SELECT id, exercise_id, rest_timer_sets FROM workout_exercises ORDER BY id DESC LIMIT 5').then(console.log);
