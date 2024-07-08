import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "hardhat-deploy";
import dotenv from "dotenv"

dotenv.config();

const testnetURL= 'https://ethereum-sepolia-rpc.publicnode.com' as string;
const mainnetURL= 'https://rpc.public.curie.radiumblock.co/ws/ethereum' as string;
const config: HardhatUserConfig = {
  defaultNetwork: 'sepolia_testnet',
  networks: {
    hardhat: {
      chainId : 1
    },
    mainnet : {
      url: mainnetURL,
      accounts: [process.env.PRIVATE_KEY?.toString() as string],
      gasPrice: 1000000000,
      chainId: 1,
    },
    sepolia_testnet : {
      url: testnetURL,
      accounts: [process.env.PRIVATE_KEY?.toString() as string],
      gasPrice: 15961613174,
      chainId: 11155111,
    },
    bnb_testnet: {
      url: process.env.BSC_TESTNET_URL || "https://bsc-testnet.publicnode.com",
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY?.toString() as string],
      gasPrice: 50e9,
      live: true,
      tags: ["test", "bnb-test"]
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200
          }
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        },
      }
    ],
  },
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "src/deploy",
    sources: "contracts",
    tests: "tests"
  },
  gasReporter: {
    enabled: true,
    onlyCalledMethods: true,
  },
  etherscan: {
    apiKey: {
      sepolia: "JDESU7DP8JV7MI4JK3HEY7PYPF64FXA897",
      mainnet: "JDESU7DP8JV7MI4JK3HEY7PYPF64FXA897",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
    }
  },
};

export default config;
