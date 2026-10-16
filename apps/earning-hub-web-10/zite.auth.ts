import { ziteAuth } from 'zitejs/auth/server';

const ALLOWED_EMAILS = ['gclass902@gmail.com'];

export default ziteAuth({
  hooks: {
    async beforeSignUp(input) {
      const email = input.email.toLowerCase().trim();
      if (ALLOWED_EMAILS.includes(email)) {
        return { allow: true };
      }
      return { deny: true, reason: 'Access restricted. Contact admin for access.' };
    },
    async beforeSignIn(input) {
      const email = input.email.toLowerCase().trim();
      if (ALLOWED_EMAILS.includes(email)) {
        return { allow: true };
      }
      return { deny: true, reason: 'Access restricted. Contact admin for access.' };
    },
  },
});
