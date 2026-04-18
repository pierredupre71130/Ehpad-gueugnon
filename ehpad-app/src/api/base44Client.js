import * as entities from '@/lib/storage';

const noOp = () => Promise.resolve(null);

export const base44 = {
  entities,
  integrations: {
    Core: {
      UploadFile: noOp,
      ExtractDataFromUploadedFile: noOp,
      InvokeLLM: noOp,
    },
  },
  auth: {
    me: noOp,
    logout: noOp,
    redirectToLogin: noOp,
  },
  appLogs: {
    logUserInApp: noOp,
  },
};
