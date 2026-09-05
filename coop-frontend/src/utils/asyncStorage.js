// A small AsyncStorage-like wrapper for web using localStorage
// Methods return Promises to mimic async storage APIs
const asyncStorage = {
  setItem(key, value) {
    return new Promise((resolve) => {
      try {
        localStorage.setItem(key, value);
      } finally {
        resolve(true);
      }
    });
  },
  getItem(key) {
    return new Promise((resolve) => {
      const val = localStorage.getItem(key);
      resolve(val);
    });
  },
  removeItem(key) {
    return new Promise((resolve) => {
      localStorage.removeItem(key);
      resolve(true);
    });
  },
};

export default asyncStorage;
