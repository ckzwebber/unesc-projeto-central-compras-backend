const AppError = require("../errors/appError");
const logger = require("./logger");

function instrumentService(instance, entity) {
  const prototype = Object.getPrototypeOf(instance);
  const methodNames = Object.getOwnPropertyNames(prototype).filter((name) => name !== "constructor" && typeof instance[name] === "function" && instance[name].constructor.name === "AsyncFunction");

  for (const methodName of methodNames) {
    const originalMethod = instance[methodName].bind(instance);

    instance[methodName] = async (...args) => {
      logger.debug(
        {
          entity,
          action: methodName,
          arg_types: args.map((arg) => {
            if (arg === null) return "null";
            if (Array.isArray(arg)) return "array";
            return typeof arg;
          }),
        },
        "Execucao de metodo de service",
      );

      try {
        return await originalMethod(...args);
      } catch (err) {
        if (err instanceof AppError && err.statusCode >= 400 && err.statusCode < 500) {
          logger.warn(
            {
              err,
              entity,
              action: methodName,
              statusCode: err.statusCode,
            },
            "Regra de negocio impediu operacao",
          );
          throw err;
        }

        logger.error(
          {
            err,
            entity,
            action: methodName,
          },
          "Falha em metodo de service",
        );

        throw err;
      }
    };
  }
}

module.exports = instrumentService;
