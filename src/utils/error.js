
function notFound(message) {
  throw new NotFoundError(message);
}

export { notFound };