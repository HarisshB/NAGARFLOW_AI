import { configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// The first test in a file renders the whole app cold. Under CPU load that took
// about 975 ms before its first role query matched (142 ms render, 432 ms until
// the mocked data showed, 401 ms for the first getByRole), against the 1000 ms
// default, so findBy* gave up on lists that were about to appear.
configure({ asyncUtilTimeout: 3000 });
