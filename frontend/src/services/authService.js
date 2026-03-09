import API from "./api";

export const register = async (userData) => {
  const { data } = await API.post("/auth/register", userData);
  return data;
};

export const login = async (userData) => {
  const { data } = await API.post("/auth/login", userData);

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);

  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};