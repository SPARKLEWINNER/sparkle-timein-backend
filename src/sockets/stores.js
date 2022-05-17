const users = [];
const add_user = (id, name, uuid, _id) => {
  const existingUser = users.find(
    (user) => user.uuid.trim().toLowerCase() === uuid.trim().toLowerCase()
  );

  if (existingUser) return { error: "Company has already been taken" };
  if (!_id && !uuid) return { error: "Company and room are required" };
  if (!uuid) return { error: "Company is required" };
  if (!_id) return { error: "Room is required" };

  const user = { id, uuid, name, _id };
  users.push(user);
  return { user };
};

const get_user = (id) => {
  let user = users.find((user) => user.id == id);
  return user;
};

const delete_users = (id) => {
  const index = users.findIndex((user) => user.id === id);
  if (index !== -1) return users.splice(index, 1)[0];
};

const get_users = (_id) =>
  users.filter((user) => {
    if (user._id === _id) return user;
  });

module.exports = { add_user, get_user, delete_users, get_users };
