import email
import os, sys
import quopri
from glob import glob


def generate_html(mhtml_path):
    assert mhtml_path[-6:] == ".mhtml"
    with open(mhtml_path, "r") as mailFile:
        msg = email.message_from_string(mailFile.read())
    
    if msg.is_multipart():
        for id, part in enumerate(msg.get_payload()):
            if part["Content-Type"] == "text/html":
                print(id, part["Content-Location"])
                fname = os.path.join(os.path.dirname(mhtml_path), os.path.basename(mhtml_path)[:-6] + ".html")
                html_context = part.get_payload()

                print(part["Content-Transfer-Encoding"])
                if part["Content-Transfer-Encoding"] == "quoted-printable":
                    html_context = quopri.decodestring(html_context)
                else:
                    raise NotImplementedError()  # 似乎还可能是 base64
                
                with open(fname, "wb") as f:
                    f.write(html_context)
                
                break

def main():
    if len(sys.argv)==1:
        print("Usage: %s filename" % os.path.basename(sys.argv[0]))
        sys.exit(1)

    mhtml_path = sys.argv[1]
    assert os.path.exists(mhtml_path)
    if os.path.isdir(mhtml_path):
        for path in glob(os.path.join(mhtml_path, "*.mhtml")):
            generate_html(path)
    else:
        generate_html(mhtml_path)
    

if __name__=="__main__":
    main()