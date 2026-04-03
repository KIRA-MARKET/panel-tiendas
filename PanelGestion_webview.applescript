-- Panel de Gestión — Lanzador PyWebView
on run
	do shell script "source ~/nominas_env/bin/activate && cd '/Users/nacho/Desktop/COSAS PARA COWORK' && python3 panel_gestion.py &> /dev/null &"
end run
