/**
 * The domain layer.
 *
 * These modules describe what technology work at Kind Home *is* — they know
 * nothing about React, about where data comes from, or about how anything is
 * displayed. Everything above them (services, stores, components) depends on
 * this layer; this layer depends on nothing but Zod.
 */
export * from "./common";
export * from "./business-hours";
export * from "./user";
export * from "./system";
export * from "./ticket";
export * from "./sla";
export * from "./project";
export * from "./diagram";
export * from "./session";
export * from "./knowledge";
export * from "./activity";
export * from "./portal";
