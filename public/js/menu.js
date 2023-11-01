function SaveGamerSession()
{
    var nickname = document.getElementById("input").value;

    if(InputValidityData(nickname))
    {
        sessionStorage.setItem('gamer_data', 'true')
        
        console.log(sessionStorage.getItem('gamer_data'));
        
        window.location.href = "/game";
    }
    else
    {
        // Леша выведи сообщение об ошибке в html.

        // И скинь фотку писюна
    }
}

function InputValidityData(nick)
{
    var regex = /^[A-Za-z0-9]{1,15}$/;
    return regex.test(nick);
}