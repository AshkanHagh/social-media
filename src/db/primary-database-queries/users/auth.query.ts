import { db } from '../../db';
import { UserTable } from '../../schema';

export const insertUser = async (fullName : string, email : string, username : string, password : string) : Promise<void> => {
    await db.insert(UserTable).values({fullName, email, username, password});
}