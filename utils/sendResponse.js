// helpers/sendResponse.js
export const sendResponse = (
  res,
  statusCode,
  success,
  message,
  data = null,
  error = null
) => {
  const response = {
    status: statusCode,
    success,
    message,
  };
  if (data) response.data = data;
  if (error) response.error = error;
  return res.status(statusCode).json(response);
};
