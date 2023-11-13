// == Natural session check. == 
function Correctness()
{
  if(sessionStorage.getItem('in_session') === 'true')
    console.log("Access is allowed")
  else
    window.location.href = "/";
}

Correctness();
// == 