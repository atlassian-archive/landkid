describe('SepculationEngine', () => {
  test('getImpact > should return impact', async () => {});
  test('positionInQueue > should return position in queue', async () => {});
  test('getAvailableSlots > should return availabled free slots', async () => {});

  describe('reOrderRequest', () => {
    test('should return false when the feature is turned off', async () => {});
    test('should return false when number of free slots are less than 2', async () => {});
    test('should return false when number of free slots are 2 and current request is 2nd in the queue', async () => {});
    test('should return false when number of free slots are 3 and current request is 3rd in the queue', async () => {});
    test('should return false when number of free slots are 2, current request is 1st in the queue and current request`s impact is less than next', async () => {});
    test('should return true when number of free slots are 2, current request is 1st in the queue and current request`s impact is greater than next', async () => {});
  });
});
