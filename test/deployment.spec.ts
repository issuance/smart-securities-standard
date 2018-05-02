import { ABI } from "../src/Contracts";
import { Client } from "../src/S3";
import { Security } from "../src/Types";

import * as assert from "assert";
import { BigNumber } from "bignumber.js";
import * as Web3 from "web3";

describe("initialize S3", () => {
  const provider = new Web3.providers.HttpProvider("http://localhost:8545");
  const web3 = new Web3(provider);
  const controller = web3.eth.accounts[0];
  const checkers = {
    amlKyc: web3.eth.accounts[1],
    accreditation: web3.eth.accounts[2]
  };
  const investor1 = web3.eth.accounts[3];
  const investor2 = web3.eth.accounts[4];
  const issuer = web3.eth.accounts[5];
  const securityOwner = web3.eth.accounts[6];
  it("should set up a new S3 framework", async () => {
    const s3 = new Client(controller, null, provider);
    await s3.initS3();
  });
  it("should set up a user checker", async () => {
    const s3 = new Client(controller, null, provider);
    await s3.initS3();
    await s3.initUserChecker([]);
  });
  // Currently the point of this test is to exercise the issuance procedure
  it("should issue a security", async () => {
    const s3 = new Client(controller, null, provider);
    await s3.initS3();

    const amlKycAddr = await s3.initUserChecker([checkers.amlKyc]);
    const AK = web3.eth.contract(ABI.SimpleUserChecker.abi).at(amlKycAddr);
    await AK.confirmUser(investor1, 0x1, { from: checkers.amlKyc });
    await AK.confirmUser(investor2, 0x2, { from: checkers.amlKyc });
    await AK.confirmUser(controller, 0x01, { from: checkers.amlKyc });

    const accreditationAddr = await s3.initUserChecker([
      checkers.accreditation
    ]);
    const AC = web3.eth
      .contract(ABI.SimpleUserChecker.abi)
      .at(accreditationAddr);
    await AC.confirmUser(investor1, 0x3, { from: checkers.accreditation });
    await AC.confirmUser(investor2, 0x4, { from: checkers.accreditation });
    await AC.confirmUser(controller, 0x02, { from: checkers.accreditation });

    const security: Security = {
      __type: "RegD",
      checkers: {
        amlKyc: amlKycAddr,
        accreditation: accreditationAddr
      },
      investors: [
        {
          address: investor1,
          amount: new BigNumber("1e5")
        },
        {
          address: investor2,
          amount: new BigNumber("2e4")
        }
      ],
      isFund: false,
      issuer,
      metadata: { name: "Security1" },
      owner: securityOwner
    };
    const result = await s3.issue(security);
    const T = web3.eth.contract(ABI.ARegD506cToken.abi).at(result.front);
    const bal1 = T.balanceOf.call(investor1);
    const bal2 = T.balanceOf.call(investor2);
    assert.equal(bal1.toNumber(), security.investors[0].amount.toNumber());
    assert.equal(bal2.toNumber(), security.investors[1].amount.toNumber());
  }).timeout(15000);
});
