import json
import re

# Regular expression for comments
comment_re = re.compile(
    '(^)?[^\S\n]*/(?:\*(.*?)\*/[^\S\n]*|/[^\n]*)($)?',
    re.DOTALL | re.MULTILINE
)

def parse_json(filename):
    """ Parse a JSON file
        First remove comments and then use the json module package
        Comments look like :
            // ...
        or
            /*
            ...
            */
    """
    with open(filename) as f:
        content = ''.join(f.readlines())

        ## Looking for comments
        match = comment_re.search(content)
        while match:
            # single line comment
            content = content[:match.start()] + content[match.end():]
            match = comment_re.search(content)


        #print content

        # Return json file
        return json.loads(content)

if __name__ == '__main__':
    f = '../settings.json'
    data = parse_json(f)
    print "LOG="+data['log']
    print "ERROR_HANDLING="+str(data['errorHandling'])
    print "EMAIL_ADDRESS="+data['emailAddress']
    print "TIME_BETWEEN_EMAILS="+str(data['timeBetweenEmails'])
    print "NODEJS="+data['nodejs']
