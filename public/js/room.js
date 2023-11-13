// { ======= Natural session check. ======= }
function Correctness()
{
  if(sessionStorage.getItem('in_session') === 'true')
    sessionStorage.setItem("in_session", "false");
  else
    window.location.href = "/";
}

Correctness();
// { ============== } 