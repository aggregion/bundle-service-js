var aggregion = window.aggregion = (function () {

    function getSignedUserInfo() {
      return localStorage.getItem('signedUserInfo');
    }

    return {
      getSignedUserInfo: getSignedUserInfo,
      webBundle: true
    };
  }
)();


(function () {
  function checkSession() {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('HEAD', '.', true);
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState === 4) {
        if(xmlhttp.status === 403) {
          document.body.innerHTML = '<h1>Your session has expired</h1>';
        }
      }
    };
    xmlhttp.send(null);
  }

  setInterval(checkSession, 5000);
})();

