import { Subject } from "rxjs";
import { ImageCapacityInterceptor } from "./image-capacity.interceptor";

it("rejects a third upload before buffering and releases capacity on completion and failure", () => {
  const gate = new ImageCapacityInterceptor();
  const first = new Subject();
  const second = new Subject();
  gate.intercept({} as any, { handle: () => first }).subscribe();
  gate
    .intercept({} as any, { handle: () => second })
    .subscribe({ error: () => {} });
  expect(() =>
    gate.intercept({} as any, { handle: () => new Subject() }),
  ).toThrow("Image processing is busy");
  first.complete();
  const third = new Subject();
  expect(() =>
    gate.intercept({} as any, { handle: () => third }).subscribe(),
  ).not.toThrow();
  second.error(new Error("upload disconnected"));
  expect(() =>
    gate.intercept({} as any, { handle: () => new Subject() }),
  ).not.toThrow();
  third.complete();
});
