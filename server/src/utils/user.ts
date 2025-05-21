/**
 * Parse a username into first and last name
 * @param username The username to parse
 * @returns Object containing first_name and last_name
 */
export const parseUsername = (username: string): { first_name: string; last_name: string } => {
  let first_name = '';
  let last_name = '';

  if (username) {
    const nameParts = username.split(' ');
    if (nameParts.length >= 2) {
      first_name = nameParts[0];
      last_name = nameParts.slice(1).join(' ');
    } else {
      first_name = username;
    }
  }

  return { first_name, last_name };
};
