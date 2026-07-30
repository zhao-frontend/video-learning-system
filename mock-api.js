window.MockLearningApi = (() => {
  const delay = (ms = 420) => new Promise((resolve) => setTimeout(resolve, ms));
  const shouldFail = () => Math.random() < 0.08;

  return {
    async saveProgress(payload) {
      await delay(260);
      localStorage.setItem(`learning-progress:${payload.lessonId}`, JSON.stringify(payload));
      return { ok: true, savedAt: Date.now() };
    },

    async toggleInteraction(type, active) {
      await delay();
      if (shouldFail()) {
        throw new Error(`${type} operation failed`);
      }
      return { ok: true, active };
    },

    async createComment(content) {
      await delay(360);
      return {
        id: `comment-${Date.now()}`,
        author: "演示用户",
        avatar: "ZX",
        content,
        createdAt: "刚刚"
      };
    }
  };
})();
