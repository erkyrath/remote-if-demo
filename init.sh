#!/usr/bin/env -S bash -c "echo 'Please use \"source init.sh\" instead' >&2; exit 1"

if declare -F deactivate >/dev/null; then
	deactivate
fi

if [[ "${dirname:-}" == "" ]]; then
	dirname="."
fi

if ! pip show virtualenv >&/dev/null; then
	python -m pip install --user virtualenv
fi
python -m virtualenv "${dirname}/venv"
source "${dirname}/venv/bin/activate"

pip install -r "${dirname}/requirements.txt"

site_packages="$(python -c 'import site; print(site.getsitepackages()[-1])')"
if [[ ! -f "${site_packages}/blorbtool.py" ]]; then
	ln -sv "$(realpath "${dirname}/../glk-dev/blorbtool.py")" "${site_packages}"
fi
