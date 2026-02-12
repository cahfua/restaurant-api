import { jest } from "@jest/globals";
import request from "supertest";

// mock DB BEFORE importing app
jest.unstable_mockModule("../src/db.js", () => ({
  connectDB: async () => ({
    collection: (name) => ({
      find: () => ({
        toArray: async () => [{ collection: name }]
      }),
      findOne: async () => ({
        _id: "507f1f77bcf86cd799439011",
        collection: name
      })
    })
  })
}));

// now import app AFTER mock
const { default: app } = await import("../server.js");

describe("GET and GET ALL routes", () => {
  test("GET ALL /restaurants returns 200", async () => {
    const res = await request(app).get("/restaurants");
    expect(res.statusCode).toBe(200);
  });

  test("GET ONE /restaurants/:id returns 200", async () => {
    const res = await request(app).get("/restaurants/507f1f77bcf86cd799439011");
    expect(res.statusCode).toBe(200);
  });

  test("GET ALL /menuItems returns 200", async () => {
    const res = await request(app).get("/menuItems");
    expect(res.statusCode).toBe(200);
  });

  test("GET ONE /menuItems/:id returns 200", async () => {
    const res = await request(app).get("/menuItems/507f1f77bcf86cd799439011");
    expect(res.statusCode).toBe(200);
  });

  test("GET ALL /orders returns 200", async () => {
    const res = await request(app).get("/orders");
    expect(res.statusCode).toBe(200);
  });

  test("GET ONE /orders/:id returns 200", async () => {
    const res = await request(app).get("/orders/507f1f77bcf86cd799439011");
    expect(res.statusCode).toBe(200);
  });

  test("GET ALL /users returns 200", async () => {
    const res = await request(app).get("/users");
    expect(res.statusCode).toBe(200);
  });

  test("GET ONE /users/:id returns 200", async () => {
    const res = await request(app).get("/users/507f1f77bcf86cd799439011");
    expect(res.statusCode).toBe(200);
  });
});