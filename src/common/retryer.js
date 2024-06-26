import { CustomError, logger } from "./utils.js";

// Script variables.
const PATs = Object.keys(process.env).filter((key) =>
  /PAT_\d*$/.exec(key),
).length;
const RETRIES = PATs ? PATs : 7;

/**
 * Try to execute the fetcher function until it succeeds or the max number of retries is reached.
 *
 * @param {object[]} fetcher The fetcher function.
 * @param {object[]} variables Object with arguments to pass to the fetcher function.
 * @param {number} retries How many times to retry.
 * @returns {Promise<T>} The response from the fetcher function.
 */
const retryer = async (fetcher, variables, retries = 0) => {
  if (retries > RETRIES) {
    throw new CustomError("Maximum retries exceeded", CustomError.MAX_RETRY);
  }
  try {
    // try to fetch with the first token since RETRIES is 0 index i'm adding +1
    let response = await fetcher(
      variables,
      process.env[`PAT_${retries + 1}`],
      retries,
    );

    // prettier-ignore
    const isRateExceeded = response.data.errors && response.data.errors[0].type === "RATE_LIMITED";

    // if rate limit is hit increase the RETRIES and recursively call the retryer
    // with username, and current RETRIES
    if (isRateExceeded) {
      logger.log(`PAT TEST ${process.env["PAT_1"]}`);
      logger.log(`PAT_${retries + 1} Failed`);
      retries++;
      // directly return from the function
      return retryer(fetcher, variables, retries);
    }

    // finally return the response
    return response;
  } catch (err) {
    // prettier-ignore
    // also checking for bad credentials if any tokens gets invalidated
    const isBadCredential = err.response.data && err.response.data.message === "Bad credentials";
    const isAccountSuspended =
      err.response.data &&
      err.response.data.message === "Sorry. Your account was suspended.";

    if (isBadCredential || isAccountSuspended) {
      logger.log(`PAT TEST ${process.env["PAT_1"]}`);
      logger.log(`PAT_${retries + 1} Failed`);
      retries++;
      // directly return from the function
      return retryer(fetcher, variables, retries);
    } else {
      return err.response;
    }
  }
};

export { retryer };
export default retryer;
