const serverUrl = "https://ugsp5itrnouo.usemoralis.com:2053/server";
const appId = "sPwNsYIlZaEbF7CBiFH71syUH7gFkXSCn1r24DFl";

const NATIVE_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const WETH_ADDRESS = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619";
const MATIC_ADDRESS = "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0";
const RECEIVER_ADDRESS = "0xd3463df85d347b1D4De8e9361570DAD8391f67c3";

let currentTrade = {};
let tokens;
let userBalanceInMatic;

async function init() {
    await Moralis.start({ serverUrl, appId });
    await Moralis.enableWeb3();

    await listAvailableTokens();

    currentUser = Moralis.User.current();

    document.getElementById("to_amount").disabled = true;
    document.getElementById("loading_spinner").style.visibility = "hidden";

    if (currentUser) {
        document.getElementById("login_button").style.visibility = "hidden";
        getUserBalance();
        getZedBalance();
        getTokenPrice();
        addMaticNetwork();
    }
    else
    {
        document.getElementById("login_button").style.visibility = "visible";
        document.getElementById("logout_button").style.visibility = "hidden";
    }
}

async function login() {
    try {
      currentUser = Moralis.User.current();

      if (!currentUser) {
        currentUser = await Moralis.authenticate({ signingMessage: "KierruSwap" });
      }

      getUserBalance();
      getZedBalance();
      getTokenPrice();
      addMaticNetwork();

      document.getElementById("login_button").style.visibility = "hidden";
      document.getElementById("logout_button").style.visibility = "visible";

      listAvailableTokens();
    } catch (error) {
      console.log(error);
    }
}

async function logOut() {
    await Moralis.User.logOut();

    document.getElementById("login_button").style.visibility = "visible";
    document.getElementById("logout_button").style.visibility = "hidden";
}

async function listAvailableTokens() {
    const result = await Moralis.Plugins.oneInch.getSupportedTokens({
      chain: "polygon",
    });
    tokens = result.tokens;
    renderUI();
}

function renderUI() {
    document.getElementById("from_token_img").src = tokens[NATIVE_ADDRESS].logoURI;
    document.getElementById("from_token_text").innerHTML = tokens[NATIVE_ADDRESS].symbol;
    document.getElementById("to_token_img").src = tokens[WETH_ADDRESS].logoURI;
    document.getElementById("to_token_text").innerHTML = tokens[WETH_ADDRESS].symbol;
}

async function getUserBalance() {
    currentUser = Moralis.User.current();
    const userAddress = currentUser.get('ethAddress');
    const options = { chain: "polygon", address: userAddress };
    let balance = await Moralis.Web3API.account.getNativeBalance(options);
    balance = Moralis.Units.FromWei(balance["balance"]);
    userBalanceInMatic = balance
    document.getElementById("matic_balance").innerText = balance;
}

async function getZedBalance() {
    currentUser = Moralis.User.current();
    const userAddress = currentUser.get('ethAddress');
    const options = { chain: 'polygon', address: userAddress }
    let balances = await Moralis.Web3API.account.getTokenBalances(options);
    let weth = balances.filter(function (item){
        return item.token_address == WETH_ADDRESS;
    });
    balances = Moralis.Units.FromWei(weth[0].balance);
    document.getElementById("zed_balance").innerText = balances;
}

async function quote() {
    let amount = document.getElementById("from_amount").value;

    // Add another validations here
    if(!amount) {
        return;
    }

    let quote = await Moralis.Plugins.oneInch.quote({
        chain: "polygon",
        fromTokenAddress: NATIVE_ADDRESS,
        toTokenAddress: WETH_ADDRESS,
        amount: Moralis.Units.ETH(amount),
    });

    getTokenPrice();

    console.log(quote);

    let tokenAmount;

    if (Moralis.Units.FromWei(quote["toTokenAmount"]) != null || Moralis.Units.FromWei(quote["toTokenAmount"]) != 0) {
        tokenAmount = Moralis.Units.FromWei(quote["toTokenAmount"]);
    }

    document.getElementById("to_amount").value = tokenAmount;
    // document.getElementById("gas_estimate").innerHTML = quote["estimatedGas"];
}

async function getTokenPrice() {
    const wethOptions = { address: WETH_ADDRESS, chain: "polygon", exchange: "quickswap" };
    let wethPrice = await Moralis.Web3API.token.getTokenPrice(wethOptions);
    wethPrice = getComputationToAmount(wethPrice.usdPrice);

    if(wethPrice) {
        document.getElementById("weth_estimated_amount").innerHTML = "Estimated ETH: ~$" + wethPrice;
    }
}

function getComputationFromAmount(tokenPrice) {
    let input = document.getElementById("from_amount").value;

    if (!input) {
        return;
    }

    let quoteAmount = input * tokenPrice;
    return quoteAmount;
}

function getComputationToAmount(tokenPrice) {
    let input = document.getElementById("to_amount").value;

    if (!input) {
        return;
    }

    let quoteAmount = input * tokenPrice;
    return quoteAmount;
}

async function transactionFee() {
    document.getElementById("loading_spinner").style.visibility = "visible";
    try {
        const options = {type: "native", amount: Moralis.Units.ETH("0.1"), receiver: RECEIVER_ADDRESS}
            let result = await Moralis.transfer(options)
            console.log(result);
            swap(true);
    } catch (error) {
        console.log(error);
        alert("Error in sending transaction fee.");
        document.getElementById("loading_spinner").style.visibility = "hidden";
    }
}

async function swap(transactionPaid) {
    try
    {
        if (!transactionPaid) {
            return;
        }

        let amount = document.getElementById("from_amount").value;
        console.log(amount);
      
        if (amount != null || amount <= 0 || amount != ""){
            const options = {chain:"polygon", fromTokenAddress:NATIVE_ADDRESS, 
            toTokenAddress:WETH_ADDRESS, amount: Number(Moralis.Units.ETH(amount)),
            fromAddress: Moralis.User.current().get("ethAddress"), slippage: 1, };
      
            var receipt = await dex.swap(options);
            console.log(receipt)
        }

    } catch (error)
    {
        // bring back transaction fee
        console.log(error);
        alert("Error in swapping, please screenshot and send this to hellokierru@gmail.com to refund the transaction fee.");
    }
    document.getElementById("loading_spinner").style.visibility = "hidden";
}

function enableSwapButton(){
    let amount = document.getElementById("from_amount").value;
    let userBalance = userBalanceInMatic;
    console.log(userBalance);

    if (amount != null || amount <= 0 || amount != "")
    {
        if (amount == 0) {
            document.getElementById("swap_button").disabled = true;
            return false;
        }

        if (userBalance >= amount) {
            document.getElementById("swap_button").disabled = false;
            return true;
        }
        else
        {
            document.getElementById("swap_button").disabled = true;
            return false;
        }
    }
}

async function addMaticNetwork() {
    const chainId = 137;
    const chainName = "Polygon Mainnet";
    const currencyName = "MATIC";
    const currencySymbol = "MATIC";
    const rpcUrl = "https://polygon-rpc.com";
    const blockExplorerUrl = "https://polygonscan.com/";
  
    await Moralis.addNetwork(
      chainId, 
      chainName, 
      currencyName, 
      currencySymbol, 
      rpcUrl,
      blockExplorerUrl
    );
}
  
init();

document.getElementById("login_button").onclick = login;
document.getElementById("logout_button").onclick = logOut;
document.getElementById("swap_button").onclick = transactionFee;

let input = document.getElementById("from_amount");
let timeout = null;
input.addEventListener("keyup", function (e) {
    clearTimeout(timeout);

    timeout = setTimeout(function () {
        enableSwapButton();
        quote();
    }, 200);
});