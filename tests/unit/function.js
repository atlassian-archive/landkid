fn = async endpoint => {
  // Call on complete failure (not when a retry should occur)
  // Throws to exit function
  const onFailure = error => {
    console.log(error);
    throw new Error(error);
  };

  const attempt = async (attemptNumber, attemptsLeft) => {
    axios.post(endpoint, {}).then(async res => {
      if (res.status === 200) {
        return true;
      }
      // Legitimate failure, not worth retrying
      if (res.status < 500) {
        onFailure(res);
      }
      // Otherwise we failed with a 5xx error and retry
      console.error('Failed, retrying', attemptNumber, attemptsLeft);
      if (attemptsLeft === 0) {
        onFailure(res);
      }
      return attemptMerge(attemptNumber + 1, attemptsLeft - 1);
    });
  };

  // 5 attempts total
  await attempt(1, 4);

  // We throw before here if unsuccessful
  console.log('success');
};
