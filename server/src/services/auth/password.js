import bcrypt from 'bcrypt';

const COST = 10;

export const hashPassword = (plain) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Compared against when the email is unknown so both paths take similar time.
const DUMMY_HASH = bcrypt.hashSync('bedlink-timing-equaliser', COST);
export const burnPasswordCheck = (plain) => bcrypt.compare(plain, DUMMY_HASH);
